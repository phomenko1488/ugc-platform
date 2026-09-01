package com.platform.ugc.dto.submission;

import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.utils.PiiMasking;
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
    /**
     * Back-office/self views (Moderator, Admin, and a worker looking at their own submissions)
     * get the real creator handle — {@code fromEntity(s, false)}.
     */
    public static SubmissionResponseDTO fromEntity(Submission s) {
        return fromEntity(s, false);
    }

    /**
     * @param maskCreatorHandle when true, {@code authorChannelName} is masked SERVER-SIDE
     *                          (never leaves the backend unmasked) rather than relying on the
     *                          frontend to mask a value it already received in full — a security
     *                          audit found the advertiser Traffic Inspector was masking creator
     *                          handles only in the React render, while the underlying API
     *                          response (and therefore the Network tab, or a direct API call)
     *                          still carried the raw handle. Advertiser-facing endpoints
     *                          ({@code getAdvertiserTraffic}, {@code getOfferSubmissions}) pass
     *                          {@code true}; internal/self views pass {@code false}.
     */
    public static SubmissionResponseDTO fromEntity(Submission s, boolean maskCreatorHandle) {
        return new SubmissionResponseDTO(
                s.getId(),
                s.getWorker().getId(),
                s.getOffer().getId(),
                s.getOffer().getTitle(),
                s.getPlatform() != null ? s.getPlatform().getCode() : null,
                s.getSourceUrl(),
                s.getExternalVideoId(),
                maskCreatorHandle ? PiiMasking.maskHandle(s.getAuthorChannelName()) : s.getAuthorChannelName(),
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