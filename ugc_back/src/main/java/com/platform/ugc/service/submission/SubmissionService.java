package com.platform.ugc.service.submission;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.submission.SubmissionCreateRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.submission.Submission;

import java.util.List;

public interface SubmissionService {
    Submission createSubmission(SubmissionCreateRequestDTO request);
    Submission getById(Long id);
    SubmissionResponseDTO getSubmissionDetails(Long id);

    /**
     * Worker Cabinet's submissions list, optionally narrowed to one status and/or one campaign
     * (offer) — pagination initiative.
     */
    PageResponseDTO<SubmissionResponseDTO> getWorkerSubmissions(Long workerId, Submission.Status status,
                                                                 Long campaignId, int page, int size);
    List<SubmissionResponseDTO> getOfferSubmissions(Long offerId, Long advertiserId);

    /**
     * Moderator queue: {@code status} null returns the whole queue (PENDING_REVIEW + DISPUTED
     * combined); a specific status narrows to just that tab. Pagination initiative.
     */
    PageResponseDTO<SubmissionResponseDTO> getPendingReviewQueue(Submission.Status status, int page, int size);
    void approveSubmission(Long submissionId, String moderationComment);
    void rejectSubmission(Long submissionId, String rejectionReason);

    /**
     * Advertiser Cabinet's Dispute Flow: an advertiser flags a submission as suspicious (fraud,
     * ToS violation, wrong GEO) instead of waiting on the normal moderation queue. Verifies the
     * submission's offer actually belongs to {@code advertiserId} before allowing it.
     */
    void disputeSubmission(Long submissionId, Long advertiserId, String category, String comment);

    /**
     * Advertiser Cabinet's Traffic Inspector: every submission across all of one advertiser's
     * offers, optionally narrowed to one status. {@code statusFilter} null returns everything.
     * Pagination initiative.
     */
    PageResponseDTO<SubmissionResponseDTO> getAdvertiserTraffic(Long advertiserId, Submission.Status statusFilter,
                                                                 int page, int size);
}