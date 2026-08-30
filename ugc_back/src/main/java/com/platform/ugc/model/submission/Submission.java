package com.platform.ugc.model.submission;

import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "submissions", indexes = {
        @Index(name = "idx_sub_worker", columnList = "worker_id"),
        @Index(name = "idx_sub_offer", columnList = "offer_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_submission_platform_external_id", columnNames = {"platform_id", "externalVideoId"})
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Submission {

    public enum Status {
        TRACKING, PENDING_REVIEW, APPROVED, REJECTED, PAID, DISPUTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "worker_id", nullable = false)
    private User worker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "offer_id", nullable = false)
    private Offer offer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "platform_id", nullable = false)
    private PlatformEntity platform;

    @Column(nullable = false, length = 1024)
    private String sourceUrl;

    @Column(nullable = false, length = 128)
    private String externalVideoId;

    private String authorChannelName;

    @Column(nullable = false)
    @Builder.Default
    private Long recordedViews = 0L;

    // Views Capping: the view count actually used to compute holdAmount (and, at settlement, the
    // worker/advertiser payout) when the offer has a maxViewsCapPerVideo — min(recordedViews, cap).
    // Null means no cap applied at submission time (offer had none set), in which case every
    // consumer should fall back to recordedViews for backward compatibility with pre-feature rows.
    private Long payableViews;

    @Column(nullable = false)
    @Builder.Default
    private Long recordedLikes = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long recordedComments = 0L;

    @Column(precision = 5, scale = 2)
    private BigDecimal currentEngagementRate;

    private String analyticsProofAssetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private Status status = Status.PENDING_REVIEW;

    @Column(length = 512)
    private String moderationComment;

    // Dispute Flow (Advertiser Cabinet, Инспектор трафика): an advertiser flagging a submission
    // as fraud/ToS-violation/wrong-geo moves it to Status.DISPUTED instead of rejecting it
    // outright, pausing any future auto-release-of-hold job (none exists in this codebase yet,
    // but any that gets added later should skip DISPUTED rows) until a moderator resolves it via
    // the existing approve/reject flow. Left populated after resolution as an audit trail.
    @Column(length = 64)
    private String disputeCategory;

    @Column(length = 512)
    private String disputeComment;

    private Instant disputedAt;

    @Column(nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal holdAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private Instant holdExpiresAt;

    private Instant lastSynchronizedAt;

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
        Submission that = (Submission) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}