package com.platform.ugc.dto.submission;

import com.platform.ugc.model.submission.Submission;
import java.math.BigDecimal;
import java.time.Instant;

public record SubmissionResponseDTO(
        Long id,
        Long workerId,
        Long offerId,
        String offerTitle,
        String platformCode,
        String sourceUrl,
        String externalVideoId,
        String authorChannelName,
        Long recordedViews,
        Long payableViews,
        Long recordedLikes,
        Long recordedComments,
        BigDecimal currentEngagementRate,
        String analyticsProofAssetUrl,
        Submission.Status status,
        String moderationComment,
        BigDecimal holdAmount,
        Instant holdExpiresAt,
        String disputeCategory,
        String disputeComment,
        Instant disputedAt,
        Instant createdAt
) {
    public static SubmissionResponseDTO fromEntity(Submission s) {
        return new SubmissionResponseDTO(
                s.getId(),
                s.getWorker().getId(),
                s.getOffer().getId(),
                s.getOffer().getTitle(),
                s.getPlatform() != null ? s.getPlatform().getCode() : null,
                s.getSourceUrl(),
                s.getExternalVideoId(),
                s.getAuthorChannelName(),
                s.getRecordedViews(),
                s.getPayableViews(),
                s.getRecordedLikes(),
                s.getRecordedComments(),
                s.getCurrentEngagementRate(),
                s.getAnalyticsProofAssetUrl(),
                s.getStatus(),
                s.getModerationComment(),
                s.getHoldAmount(),
                s.getHoldExpiresAt(),
                s.getDisputeCategory(),
                s.getDisputeComment(),
                s.getDisputedAt(),
                s.getCreatedAt()
        );
    }
}