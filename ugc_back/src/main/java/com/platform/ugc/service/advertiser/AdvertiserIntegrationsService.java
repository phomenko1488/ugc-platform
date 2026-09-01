package com.platform.ugc.service.advertiser;

import com.platform.ugc.dto.integration.AdvertiserIntegrationsDTO;
import com.platform.ugc.dto.integration.ApiTokenCreatedResponseDTO;
import com.platform.ugc.dto.integration.ApiTokenResponseDTO;
import com.platform.ugc.model.integration.ApiToken;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.integration.ApiTokenRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

/**
 * Backs the Advertiser Cabinet's "API и Интеграции" page: generating/revoking programmatic API
 * tokens and setting the advertiser's own postback URL (where the platform would notify their
 * casino backend of conversion/payout events).
 * <p>
 * Tokens follow the same opaque-secret discipline as {@link com.platform.ugc.service.auth.OneTimeTokenService}
 * (32 bytes of {@link SecureRandom}) — the difference is only the hash is persisted
 * ({@link #hash(String)}, SHA-256), never the plaintext, so a generated token can be shown to the
 * advertiser exactly once and is unrecoverable afterward even from the database.
 * <p>
 * Scope note: this issues and lets an advertiser manage tokens, but no inbound authentication
 * filter accepts them yet — wiring a public, token-authenticated API for external casino
 * backends to call is a separate initiative from this cabinet-side management UI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdvertiserIntegrationsService {

    private static final String TOKEN_PREFIX = "sk_live_";
    private static final int TOKEN_SECRET_BYTES = 32;

    private final ApiTokenRepository apiTokenRepository;
    private final UserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public AdvertiserIntegrationsDTO getIntegrations(Long advertiserId) {
        User advertiser = requireAdvertiser(advertiserId);
        List<ApiTokenResponseDTO> tokens = apiTokenRepository.findAllByAdvertiserIdOrderByCreatedAtDesc(advertiserId)
                .stream()
                .map(ApiTokenResponseDTO::fromEntity)
                .toList();
        return new AdvertiserIntegrationsDTO(advertiser.getPostbackUrl(), tokens);
    }

    @Transactional
    public ApiTokenCreatedResponseDTO generateToken(Long advertiserId, String label) {
        User advertiser = requireAdvertiser(advertiserId);

        byte[] secretBytes = new byte[TOKEN_SECRET_BYTES];
        random.nextBytes(secretBytes);
        String secret = Base64.getUrlEncoder().withoutPadding().encodeToString(secretBytes);
        String plaintextToken = TOKEN_PREFIX + secret;

        ApiToken token = ApiToken.builder()
                .advertiser(advertiser)
                .label(label.trim())
                .tokenHash(hash(plaintextToken))
                .tokenPreview(plaintextToken.substring(0, Math.min(10, plaintextToken.length())))
                .createdAt(Instant.now())
                .build();
        apiTokenRepository.save(token);

        log.info("API-токен сгенерирован [advertiserId={}, tokenId={}, label={}]", advertiserId, token.getId(), token.getLabel());
        return new ApiTokenCreatedResponseDTO(token.getId(), token.getLabel(), plaintextToken, token.getCreatedAt());
    }

    @Transactional
    public void revokeToken(Long advertiserId, Long tokenId) {
        ApiToken token = apiTokenRepository.findByIdAndAdvertiserId(tokenId, advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Токен не найден: " + tokenId));
        if (token.isRevoked()) {
            return; // Idempotent — retried revoke requests don't error out.
        }
        token.setRevokedAt(Instant.now());
        apiTokenRepository.save(token);
        log.info("API-токен отозван [advertiserId={}, tokenId={}]", advertiserId, tokenId);
    }

    @Transactional
    public void updatePostbackUrl(Long advertiserId, String postbackUrl) {
        User advertiser = requireAdvertiser(advertiserId);
        advertiser.setPostbackUrl(postbackUrl == null || postbackUrl.isBlank() ? null : postbackUrl.trim());
        userRepository.save(advertiser);
    }

    private User requireAdvertiser(Long advertiserId) {
        User user = userRepository.findById(advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));
        if (!user.getRoles().contains(com.platform.ugc.model.user.Role.ROLE_ADVERTISER)) {
            throw new AccessDeniedException("Пользователь не является рекламодателем.");
        }
        return user;
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hashed.length * 2);
            for (byte b : hashed) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is a mandatory JCA algorithm on every JVM — this branch cannot happen.
            throw new IllegalStateException("SHA-256 недоступен в текущей JVM", e);
        }
    }
}
