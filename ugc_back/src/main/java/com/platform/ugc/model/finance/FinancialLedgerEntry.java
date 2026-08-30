package com.platform.ugc.model.finance;

import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "financial_ledger")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class FinancialLedgerEntry {

    public enum EntryType {
        WORKER_PAYOUT,
        B2C_REFERRAL_COMMISSION,
        B2B_PARTNER_COMMISSION,
        PLATFORM_NET_PROFIT,
        ADVERTISER_DEPOSIT,
        WORKER_WITHDRAWAL,
        ADVERTISER_BUDGET_REFUND,
        // Admin Back-Office: a manual correction to a user's availableBalance (POST
        // /api/v1/admin/users/{id}/balance-adjust). amount carries the signed delta applied
        // (positive credit or negative debit), same convention WORKER_WITHDRAWAL already uses.
        ADMIN_BALANCE_ADJUSTMENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id")
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offer_id")
    private Offer offer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EntryType entryType;

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal amount;

    @Column(name = "recorded_views")
    private Long recordedViews;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public EntryType getType() {
        return this.entryType;
    }
}