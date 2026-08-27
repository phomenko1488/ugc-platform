package com.platform.ugc.model.finance;

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
        WORKER_WITHDRAWAL
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EntryType entryType;

    @Column(nullable = false, precision = 16, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}