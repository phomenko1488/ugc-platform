package com.platform.ugc.model.auth;

import com.platform.ugc.model.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A single-use, expiring token issued against one user for one purpose — backs both the
 * forgot-password flow ({@code PASSWORD_RESET}) and the Telegram account-binding flow
 * ({@code TG_BIND}: {@code POST /api/v1/users/{userId}/tg-bind-token} + the bot's
 * {@code /start bind_TOKEN} command). One table for both rather than two near-identical ones —
 * they share the exact same lifecycle: issue with a TTL, consume at most once, reject if expired
 * or already used.
 */
@Entity
@Table(name = "one_time_tokens", indexes = {
        @Index(name = "idx_ott_token", columnList = "token", unique = true)
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OneTimeToken {

    public enum Purpose {
        PASSWORD_RESET, TG_BIND
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Purpose purpose;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant usedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    @Transient
    public boolean isUsable() {
        return usedAt == null && expiresAt != null && expiresAt.isAfter(Instant.now());
    }
}
