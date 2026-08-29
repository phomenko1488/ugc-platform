package com.platform.ugc.dto.offer;

import com.platform.ugc.model.submission.Submission;
import java.math.BigDecimal;
import java.time.Instant;

public record WorkerOfferSubmissionDTO(
        Long id,
        String offerTitle,
        String platformCode,
        String sourceUrl,
        String status,
        Long declaredViews,
        Long recordedViews,
        Long recordedLikes,
        BigDecimal currentEngagementRate,
        BigDecimal holdAmount,
        Instant holdExpiresAt,
        String rejectionReason,
        String moderatorComment,
        String disputeCategory,
        String disputeComment
) {
    public static WorkerOfferSubmissionDTO from(Submission submission) {
        String comment = submission.getModerationComment();
        return new WorkerOfferSubmissionDTO(
                submission.getId(),
                submission.getOffer() != null ? submission.getOffer().getTitle() : null,
                submission.getPlatform() != null ? submission.getPlatform().getCode() : null,
                submission.getSourceUrl(),
                String.valueOf(submission.getStatus()),
                submission.getRecordedViews(),
                submission.getRecordedViews(),
                submission.getRecordedLikes(),
                submission.getCurrentEngagementRate(),
                submission.getHoldAmount(),
                submission.getHoldExpiresAt(),
                comment,
                comment,
                submission.getDisputeCategory(),
                submission.getDisputeComment()
        );
    }
}