package com.platform.ugc.service.auth;

import com.platform.ugc.model.auth.OneTimeToken;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.auth.OneTimeTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Issues and consumes {@link OneTimeToken}s — the shared one-time-token mechanism behind the
 * forgot-password flow and the {@code POST /api/v1/users/{userId}/tg-bind-token} Telegram
 * account-binding flow. Tokens are opaque, URL-safe random strings (32 bytes of
 * {@link SecureRandom}, Base64url-encoded) — never a sequential ID or anything derived from user
 * data, so guessing one is as hard as guessing any other 256-bit secret.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OneTimeTokenService {

    private final OneTimeTokenRepository tokenRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public String issue(User user, OneTimeToken.Purpose purpose, Duration ttl) {
        // Superseding any earlier, still-unused token of the same purpose keeps at most one live
        // token per (user, purpose) at a time — re-requesting a bind token or a password reset
        // can't leave stale tokens usable in parallel.
        tokenRepository.invalidateAllUnused(user.getId(), purpose, Instant.now());

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokenRepository.save(OneTimeToken.builder()
                .token(token)
                .user(user)
                .purpose(purpose)
                .expiresAt(Instant.now().plus(ttl))
                .build());

        log.info("Issued one-time token [purpose={}, userId={}, ttl={}]", purpose, user.getId(), ttl);
        return token;
    }

    /** Looks up a token without consuming it — lets a caller validate before, e.g., showing a reset form. */
    @Transactional(readOnly = true)
    public Optional<OneTimeToken> find(String token, OneTimeToken.Purpose purpose) {
        return tokenRepository.findByTokenAndPurpose(token, purpose).filter(OneTimeToken::isUsable);
    }

    /**
     * Validates, deletes the token from the database, and returns the owning user — or empty if
     * the token is missing/expired/already used. Deleting it outright (rather than only setting
     * {@code usedAt}) is deliberate: a row that no longer exists can't be replayed even by a bug
     * elsewhere that forgets to check {@link OneTimeToken#isUsable()}, which is a stronger
     * guarantee than a boolean/timestamp flag — and it's what the password-reset flow specifically
     * requires (the reset must be a single request that leaves nothing reusable behind).
     * <p>
     * Uses {@link OneTimeTokenRepository#findByTokenAndPurposeForUpdate} (a
     * {@code SELECT ... FOR UPDATE}) rather than the plain lookup: two concurrent requests
     * presenting the same token now serialize on this row, so the second one always sees it
     * already gone instead of both racing past {@link OneTimeToken#isUsable()} and both trying to
     * "successfully" consume it.
     */
    @Transactional
    public Optional<User> consume(String token, OneTimeToken.Purpose purpose) {
        Optional<OneTimeToken> found = tokenRepository.findByTokenAndPurposeForUpdate(token, purpose);
        if (found.isEmpty() || !found.get().isUsable()) {
            return Optional.empty();
        }
        OneTimeToken ott = found.get();
        User user = ott.getUser();
        tokenRepository.delete(ott);
        log.info("Consumed and deleted one-time token [purpose={}, userId={}]", purpose, user.getId());
        return Optional.of(user);
    }
}
