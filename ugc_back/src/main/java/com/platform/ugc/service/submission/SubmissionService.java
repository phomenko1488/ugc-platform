package com.platform.ugc.service.submission;

import com.platform.ugc.dto.submission.SubmissionCreateRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.submission.Submission;

import java.util.List;

public interface SubmissionService {
    Submission createSubmission(SubmissionCreateRequestDTO request);
    Submission getById(Long id);
    SubmissionResponseDTO getSubmissionDetails(Long id);
    List<SubmissionResponseDTO> getWorkerSubmissions(Long workerId);
    List<SubmissionResponseDTO> getOfferSubmissions(Long offerId, Long advertiserId);
    List<SubmissionResponseDTO> getPendingReviewQueue();
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
     */
    List<SubmissionResponseDTO> getAdvertiserTraffic(Long advertiserId, Submission.Status statusFilter);
}