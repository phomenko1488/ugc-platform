package com.platform.ugc.model.payout;

import com.platform.ugc.model.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * A USDT (TRC-20) withdrawal request — the entity behind both the Worker/Partner Wallet pages'
 * "Заказать выплату" flow (ugc-client's {@code api.requestPayout}/{@code api.getPayoutHistory},
 * which previously had no backing controller — see PayoutController) and the Admin Back-Office's
 * Payout Desk ({@code AdminPayoutsPage}).
 * <p>
 * Lifecycle: {@code PENDING} (money already deducted from the requester's {@code availableBalance}
 * at creation time, so it can't be double-spent while the request sits in the queue) →
 * {@code PROCESSING} (an admin has picked it up) → either {@code COMPLETED} (admin supplies the
 * Tron {@code txHash}; a {@code WORKER_WITHDRAWAL} ledger entry is recorded) or {@code REJECTED}
 * (the deducted amount is refunded back to {@code availableBalance} — see
 * {@code PayoutServiceImpl.reject}).
 */
@Entity
@Table(name = "payouts", indexes = {
        @Index(name = "idx_payout_user", columnList = "user_id"),
        @Index(name = "idx_payout_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Payout {

    public enum Status {
        PENDING, PROCESSING, COMPLETED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 64)
    private String trc20Wallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(length = 128)
    private String txHash;

    @Column(length = 512)
    private String comment;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Payout payout = (Payout) o;
        return id != null && Objects.equals(id, payout.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
