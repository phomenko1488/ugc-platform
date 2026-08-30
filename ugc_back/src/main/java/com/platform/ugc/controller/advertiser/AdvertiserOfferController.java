package com.platform.ugc.controller.advertiser;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.advertiser.AdvertiserOfferDetailsDTO;
import com.platform.ugc.dto.advertiser.DepositRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.service.advertiser.AdvertiserOfferService;
import com.platform.ugc.service.submission.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Advertiser Cabinet routes that don't fit neatly under {@code OfferController} or
 * {@code SubmissionController} because they're scoped by advertiser first, offer/submission
 * second: Campaign Detail Hub drill-down, stopping a campaign early, the Traffic Inspector
 * registry (delegated to {@link SubmissionService#getAdvertiserTraffic}), and the Billing page's
 * simulated top-up.
 */
@RestController
@RequestMapping("/api/v1/advertiser/{advertiserId}")
@RequiredArgsConstructor
public class AdvertiserOfferController {

    private final AdvertiserOfferService advertiserOfferService;
    private final SubmissionService submissionService;

    @GetMapping("/offers/{offerId}/details")
    public ResponseEntity<ResponseDTO<AdvertiserOfferDetailsDTO>> getOfferDetails(
            @PathVariable Long advertiserId,
            @PathVariable Long offerId
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(advertiserOfferService.getOfferDetails(advertiserId, offerId)));
    }

    @PostMapping("/offers/{offerId}/stop")
    public ResponseEntity<ResponseDTO<Void>> stopOffer(
            @PathVariable Long advertiserId,
            @PathVariable Long offerId
    ) {
        advertiserOfferService.stopOffer(advertiserId, offerId);
        return ResponseEntity.ok(ResponseDTO.ok("Кампания остановлена, неиспользованный бюджет возвращён на баланс", null));
    }

    @GetMapping("/traffic")
    public ResponseEntity<ResponseDTO<PageResponseDTO<SubmissionResponseDTO>>> getTraffic(
            @PathVariable Long advertiserId,
            @RequestParam(required = false) Submission.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getAdvertiserTraffic(advertiserId, status, page, size)));
    }

    @PostMapping("/deposit")
    public ResponseEntity<ResponseDTO<Void>> deposit(
            @PathVariable Long advertiserId,
            @Valid @RequestBody DepositRequestDTO request
    ) {
        advertiserOfferService.depositToBalance(advertiserId, request.amount());
        return ResponseEntity.ok(ResponseDTO.ok("Баланс пополнен", null));
    }
}
