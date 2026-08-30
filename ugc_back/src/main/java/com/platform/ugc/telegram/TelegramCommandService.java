package com.platform.ugc.telegram;

import com.platform.ugc.model.auth.OneTimeToken;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.auth.OneTimeTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Business logic behind the two non-trivial {@code /start} variants — {@link TelegramBotService}
 * only parses the update and renders the reply; every read/write against {@code User}/
 * {@code OneTimeToken} happens here so it stays independently testable and doesn't depend on
 * however updates actually arrive (long-polling today, a webhook controller tomorrow).
 * <p>
 * Note on identifiers: for a private chat with the bot (the only kind this module deals with —
 * there is no group-chat support), a Telegram user's own ID and the chat ID for messaging them
 * are the same number. Both are accepted here as separate parameters to keep the method
 * signatures self-documenting, but only one value ({@code chatId}) is actually persisted on
 * {@link User#getTelegramId()}, since that's the only one ever used to send a message back.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramCommandService {

    private final UserRepository userRepository;
    private final OneTimeTokenService oneTimeTokenService;

    /**
     * {@code /start ref_<affiliateTag>} — finds-or-creates the worker behind this Telegram chat,
     * attaching the referral (B2C affiliate program) on first contact only. Re-running it for an
     * already-registered worker is a safe no-op lookup (no duplicate account, no re-attribution).
     */
    @Transactional
    public User processReferral(Long tgId, Long chatId, String username, String affiliateTag) {
        return userRepository.findByTelegramId(chatId)
                .orElseGet(() -> registerWorker(chatId, username, affiliateTag));
    }

    /**
     * {@code /start bind_<token>} — validates the one-time bind token, and on success attaches
     * {@code chatId} to the token's owning web account (Advertiser/Moderator/Partner). Fails
     * (empty result) if the token is missing/expired/already used, or if this Telegram chat is
     * already bound to a different UGC Flow account.
     */
    @Transactional
    public Optional<User> processBinding(Long tgId, Long chatId, String username, String token) {
        Optional<User> userOpt = oneTimeTokenService.consume(token, OneTimeToken.Purpose.TG_BIND);
        if (userOpt.isEmpty()) {
            log.warn("Telegram bind attempt with invalid/expired token from chatId={}", chatId);
            return Optional.empty();
        }

        User user = userOpt.get();
        if (userRepository.existsByTelegramId(chatId) && !chatId.equals(user.getTelegramId())) {
            log.warn("Telegram chatId={} already bound to a different user; bind for user #{} rejected",
                    chatId, user.getId());
            return Optional.empty();
        }

        user.setTelegramId(chatId);
        userRepository.save(user);
        log.info("Telegram chatId={} bound to user #{} ({})", chatId, user.getId(), user.getEmail());
        return Optional.of(user);
    }

    private User registerWorker(Long chatId, String username, String affiliateTag) {
        String resolvedUsername = username != null && !username.isBlank() ? username : "tg_" + chatId;

        User referrer = null;
        if (affiliateTag != null && !affiliateTag.isBlank()) {
            referrer = userRepository.findByAffiliateTag(affiliateTag.trim()).orElse(null);
            if (referrer != null && Boolean.TRUE.equals(referrer.getIsBanned())) {
                referrer = null;
            }
        }

        Set<Role> roles = new HashSet<>();
        roles.add(Role.ROLE_WORKER);

        User worker = User.builder()
                .telegramId(chatId)
                .username(resolvedUsername)
                .affiliateTag("wrk_" + chatId)
                .availableBalance(BigDecimal.ZERO)
                .roles(roles)
                .b2cReferrer(referrer)
                .build();

        User saved = userRepository.save(worker);
        log.info("Telegram bot registered new worker [ID: {}, chatId: {}, refTag: {}]", saved.getId(), chatId, affiliateTag);
        return saved;
    }
}
