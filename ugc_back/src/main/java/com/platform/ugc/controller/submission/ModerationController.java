package com.platform.ugc.controller.submission;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.submission.ModerationActionDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.service.submission.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final SubmissionService submissionService;

    @GetMapping("/queue")
    public ResponseEntity<ResponseDTO<List<SubmissionResponseDTO>>> getQueue() {
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getPendingReviewQueue()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ResponseDTO<Void>> approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ModerationActionDTO action
    ) {
        String comment = action != null && action.comment() != null ? action.comment() : "Одобрено";
        submissionService.approveSubmission(id, comment);
        return ResponseEntity.ok(ResponseDTO.ok("Заявка одобрена, баланс зачислен", null));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ResponseDTO<Void>> reject(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ModerationActionDTO action
    ) {
        String comment = action != null && action.comment() != null ? action.comment() : "Отклонено";
        submissionService.rejectSubmission(id, comment);
        return ResponseEntity.ok(ResponseDTO.ok("Заявка отклонена, балансы скорректированы", null));
    }
}