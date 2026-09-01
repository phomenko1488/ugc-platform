package com.platform.ugc.model.integration;

import com.platform.ugc.model.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A programmatic access token an advertiser generates from the Advertiser Cabinet's "API и
 * Интеграции" section (e.g. so their own casino backend can pull campaign/traffic data).
 * <p>
 * Only {@link #tokenHash} (SHA-256 of the full secret) and {@link #tokenPreview} (its first 10
 * characters, e.g. {@code sk_live_ab}) are ever persisted — the full plaintext token is generated,
 * returned to the caller exactly once by {@code ApiTokenService#generate}, and never stored or
 * logged, matching how {@code OneTimeTokenService} already treats bind/reset tokens as opaque
 * secrets. Revoking sets {@link #revokedAt} rather than deleting the row, so a token's history
 * (when it was issued, when it was pulled) survives in the advertiser's own audit trail.
 */
@Entity
@Table(name = "api_tokens", indexes = {
        @Index(name = "idx_api_token_advertiser", columnList = "advertiser_id"),
        @Index(name = "idx_api_token_hash", columnList = "tokenHash", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advertiser_id", nullable = false)
    private User advertiser;

    @Column(nullable = false, length = 64)
    private String label;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 16)
    private String tokenPreview;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant lastUsedAt;

    private Instant revokedAt;

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
