package com.platform.ugc.controller.submission;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.submission.DisputeRequestDTO;
import com.platform.ugc.dto.submission.SubmissionCreateRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.service.submission.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping
    public ResponseEntity<ResponseDTO<SubmissionResponseDTO>> submitVideo(
            @Valid @RequestBody SubmissionCreateRequestDTO request
    ) {
        Submission submission = submissionService.createSubmission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.ok("Видео отправлено на проверку", SubmissionResponseDTO.fromEntity(submission)));
    }

    @GetMapping("/worker/{workerId}")
    public ResponseEntity<ResponseDTO<PageResponseDTO<SubmissionResponseDTO>>> getWorkerSubmissions(
            @PathVariable Long workerId,
            @RequestParam(required = false) Submission.Status status,
            @RequestParam(required = false) Long campaignId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getWorkerSubmissions(workerId, status, campaignId, page, size)));
    }

    @GetMapping("/offer/{offerId}")
    public ResponseEntity<ResponseDTO<List<SubmissionResponseDTO>>> getOfferSubmissions(
            @PathVariable Long offerId,
            @RequestParam Long advertiserId
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getOfferSubmissions(offerId, advertiserId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO<SubmissionResponseDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getSubmissionDetails(id)));
    }

    @PostMapping("/{submissionId}/dispute")
    public ResponseEntity<ResponseDTO<Void>> disputeSubmission(
            @PathVariable Long submissionId,
            @RequestParam Long advertiserId,
            @Valid @RequestBody DisputeRequestDTO request
    ) {
        submissionService.disputeSubmission(submissionId, advertiserId, request.reason(), request.comment());
        return ResponseEntity.ok(ResponseDTO.ok("Заявка отправлена на пересмотр модератором", null));
    }
}