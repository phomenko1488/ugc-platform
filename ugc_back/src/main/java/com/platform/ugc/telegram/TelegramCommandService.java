package com.platform.ugc.telegram;

import com.platform.ugc.model.auth.OneTimeToken;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.auth.OneTimeTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

/**
 * Dispatches the three {@code /start} variants the bot supports — plain, {@code ref_TAG} (worker
 * onboarding with an affiliate referral), and {@code bind_TOKEN} (linking an existing
 * Advertiser/Partner web account to their Telegram chat). Kept independent of however updates
 * actually arrive (long-polling via {@link TelegramUpdatePoller} today, a webhook controller
 * tomorrow) — both would call straight into this class.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramCommandService {

    private static final String WEBAPP_BUTTON_LABEL = "🚀 Открыть UGC Flow";

    private final UserRepository userRepository;
    private final OneTimeTokenService oneTimeTokenService;
    private final TelegramBotClient botClient;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    // Transactional here, not on the private helpers below: they're only ever reached via
    // self-invocation (handleStart calling this.handlePlainStart(...) etc.), which bypasses
    // Spring's proxy-based transaction advice entirely — @Transactional on them would be a
    // silent no-op. Putting it on this single externally-called entry point instead means the
    // whole dispatch (including whichever helper runs) executes inside one real transaction.
    @Transactional
    public void handleStart(Long chatId, String username, String firstName, String payload) {
        if (chatId == null) {
            return;
        }
        if (payload == null || payload.isBlank()) {
            handlePlainStart(chatId, username, firstName);
        } else if (payload.startsWith("ref_")) {
            handleRefStart(chatId, username, firstName, payload.substring("ref_".length()));
        } else if (payload.startsWith("bind_")) {
            handleBindStart(chatId, payload.substring("bind_".length()));
        } else {
            handlePlainStart(chatId, username, firstName);
        }
    }

    /** Plain {@code /start} — greets whoever they are (auto-registering a worker on first contact) with the Mini App button. */
    private void handlePlainStart(Long chatId, String username, String firstName) {
        User worker = userRepository.findByTelegramId(chatId).orElseGet(() -> registerWorker(chatId, username, firstName, null));
        botClient.sendMessageWithWebAppButton(chatId,
                "Добро пожаловать в UGC Flow, " + displayName(worker, username, firstName) + "! 🎬\n\n" +
                        "Здесь вы находите офферы от рекламодателей, снимаете ролики и получаете за это деньги.",
                WEBAPP_BUTTON_LABEL, frontendBaseUrl);
    }

    /** {@code /start ref_TAG} — worker onboarding with a referral tag attached (B2C affiliate program). */
    private void handleRefStart(Long chatId, String username, String firstName, String refTag) {
        User worker = userRepository.findByTelegramId(chatId).orElseGet(() -> registerWorker(chatId, username, firstName, refTag));
        String greeting = worker.getB2cReferrer() != null
                ? "Добро пожаловать в UGC Flow, " + displayName(worker, username, firstName) + "! 🎬\n\n" +
                  "Вы зарегистрированы по реферальной ссылке."
                : "Добро пожаловать в UGC Flow, " + displayName(worker, username, firstName) + "! 🎬";
        botClient.sendMessageWithWebAppButton(chatId, greeting, WEBAPP_BUTTON_LABEL, frontendBaseUrl);
    }

    /** {@code /start bind_TOKEN} — links this Telegram chat to an existing Advertiser/Partner account. */
    private void handleBindStart(Long chatId, String token) {
        var userOpt = oneTimeTokenService.consume(token, OneTimeToken.Purpose.TG_BIND);
        if (userOpt.isEmpty()) {
            botClient.sendMessage(chatId, "Ссылка привязки недействительна или уже устарела. Сгенерируйте новую в личном кабинете.");
            return;
        }
        User user = userOpt.get();
        if (userRepository.existsByTelegramId(chatId) && !chatId.equals(user.getTelegramId())) {
            botClient.sendMessage(chatId, "Этот Telegram-аккаунт уже привязан к другому пользователю UGC Flow.");
            return;
        }
        user.setTelegramId(chatId);
        userRepository.save(user);
        botClient.sendMessageWithWebAppButton(chatId,
                "Telegram успешно привязан к вашему аккаунту UGC Flow (" + user.getUsername() + "). " +
                        "Теперь вы будете получать уведомления сюда.",
                WEBAPP_BUTTON_LABEL, frontendBaseUrl);
    }

    private User registerWorker(Long chatId, String username, String firstName, String refTag) {
        String resolvedUsername = username != null && !username.isBlank()
                ? username
                : (firstName != null && !firstName.isBlank() ? firstName : "tg_" + chatId);

        User referrer = null;
        if (refTag != null && !refTag.isBlank()) {
            referrer = userRepository.findByAffiliateTag(refTag.trim()).orElse(null);
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
        log.info("Telegram bot registered new worker [ID: {}, tgId: {}, refTag: {}]", saved.getId(), chatId, refTag);
        return saved;
    }

    private String displayName(User user, String username, String firstName) {
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return username != null ? username : (firstName != null ? firstName : "друг");
    }
}
