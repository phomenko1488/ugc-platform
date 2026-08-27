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
}