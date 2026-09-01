package com.platform.ugc.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * Issues and validates the platform's JWT access/refresh tokens.
 * <p>
 * Access tokens: short-lived (default 24h), used to authenticate API calls.
 * Refresh tokens: long-lived (default 30d), used only against POST /api/v1/auth/refresh
 * to mint a new access token. Both carry a "type" claim so one can never be used as the other.
 */
@Service
public class JwtService {

    public static final String CLAIM_TYPE = "type";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_USERNAME = "username";
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey signingKey;
    private final String issuer;
    private final long accessTokenTtlMinutes;
    private final long refreshTokenTtlDays;

    // Base64 of "dev-only-ugc-flow-jwt-secret-do-not-use-in-prod-please-rotate-me" — the literal
    // default baked into application-dev.properties's ${JWT_SECRET:...} fallback. Public the
    // moment this repository is, so a deployment that forgets to set the JWT_SECRET env var would
    // silently sign every token — including admin tokens — with a secret anyone can read on
    // GitHub. See the constructor below for the fail-fast guard this enables.
    private static final String KNOWN_DEV_DEFAULT_SECRET_B64 =
            "ZGV2LW9ubHktdWdjLWZsb3ctand0LXNlY3JldC1kby1ub3QtdXNlLWluLXByb2QtcGxlYXNlLXJvdGF0ZS1tZQ==";

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.issuer:ugc-flow}") String issuer,
            @Value("${app.jwt.access-token-ttl-minutes:1440}") long accessTokenTtlMinutes,
            @Value("${app.jwt.refresh-token-ttl-days:30}") long refreshTokenTtlDays,
            @Value("${spring.profiles.active:}") String activeProfiles
    ) {
        // Refuse to start rather than silently sign every token (including admin ones) with a
        // secret that's sitting in plain text in this repo's application-dev.properties. This is
        // a fail-fast net for whenever a real "prod"/"production" profile is introduced — it
        // does nothing today since spring.profiles.active is hardcoded to "dev" in
        // application.properties, which is itself a separate finding (see the audit report).
        boolean looksLikeProd = activeProfiles != null
                && (activeProfiles.toLowerCase(java.util.Locale.ROOT).contains("prod"));
        if (looksLikeProd && KNOWN_DEV_DEFAULT_SECRET_B64.equals(secret)) {
            throw new IllegalStateException(
                    "app.jwt.secret is still the publicly-known dev default while running with a "
                            + "'prod' profile. Set the JWT_SECRET environment variable to a real, "
                            + "randomly-generated secret before starting in production.");
        }
        this.signingKey = resolveSigningKey(secret);
        this.issuer = issuer;
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    private static SecretKey resolveSigningKey(String secret) {
        // app.jwt.secret is expected Base64-encoded (see application-dev.properties). Fall back to
        // raw UTF-8 bytes if it isn't valid Base64, then pad/hash isn't attempted here on purpose:
        // an under-length secret should fail loudly at startup rather than silently degrade security.
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException notBase64) {
            keyBytes = secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(Long userId, String username, String email, Collection<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, TOKEN_TYPE_ACCESS)
                .claim(CLAIM_ROLES, roles)
                .claim(CLAIM_USERNAME, username)
                .claim(CLAIM_EMAIL, email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtlMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, TOKEN_TYPE_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTokenTtlDays, ChronoUnit.DAYS)))
                .signWith(signingKey)
                .compact();
    }

    /** Parses + validates signature/expiry. Returns empty on any failure instead of throwing. */
    public Optional<Claims> parseClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public boolean isAccessToken(Claims claims) {
        return TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public Long extractUserId(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(Claims claims) {
        Object raw = claims.get(CLAIM_ROLES);
        if (raw instanceof List<?> list) {
            return (List<String>) list;
        }
        return List.of();
    }

    public long getAccessTokenTtlMinutes() {
        return accessTokenTtlMinutes;
    }

    public long getRefreshTokenTtlDays() {
        return refreshTokenTtlDays;
    }
}
