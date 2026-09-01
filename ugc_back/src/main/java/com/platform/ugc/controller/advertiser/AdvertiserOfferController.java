package com.platform.ugc.controller.advertiser;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.advertiser.AdvertiserOfferDetailsDTO;
import com.platform.ugc.dto.advertiser.DepositRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.security.CurrentUserUtil;
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

    // Every method here used to trust {advertiserId} as a bare path variable — SecurityConfig's
    // "/api/v1/advertiser/**" rule only checked the caller had ROLE_ADVERTISER (or ROLE_ADMIN),
    // never that they WERE this specific advertiser. Any advertiser could read another
    // advertiser's campaign details/traffic, stop a competitor's campaign, or (see /deposit)
    // fabricate balance for another advertiser's account by substituting their id in the URL.

    @GetMapping("/offers/{offerId}/details")
    public ResponseEntity<ResponseDTO<AdvertiserOfferDetailsDTO>> getOfferDetails(
            @PathVariable Long advertiserId,
            @PathVariable Long offerId
    ) {
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
        return ResponseEntity.ok(ResponseDTO.ok(advertiserOfferService.getOfferDetails(advertiserId, offerId)));
    }

    @PostMapping("/offers/{offerId}/stop")
    public ResponseEntity<ResponseDTO<Void>> stopOffer(
            @PathVariable Long advertiserId,
            @PathVariable Long offerId
    ) {
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
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
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
        return ResponseEntity.ok(ResponseDTO.ok(submissionService.getAdvertiserTraffic(advertiserId, status, page, size)));
    }

    /**
     * NOTE (pre-existing, unrelated to this audit's ownership-check fixes): {@code DepositRequestDTO}
     * itself documents that no real payment rail is wired up here yet — this unconditionally
     * credits {@code amount} to the advertiser's balance on the honor system. The ownership check
     * added below stops one advertiser from fabricating balance on ANOTHER advertiser's account,
     * but it does NOT make the endpoint safe to expose to real money: an advertiser can still
     * fabricate unlimited balance for their OWN account and use it to pay real USDT out to
     * workers. This must be wired to a real payment processor (card/crypto on-ramp with a
     * verified webhook) before production traffic — do not treat the ownership check alone as a
     * fix for that.
     */
    @PostMapping("/deposit")
    public ResponseEntity<ResponseDTO<Void>> deposit(
            @PathVariable Long advertiserId,
            @Valid @RequestBody DepositRequestDTO request
    ) {
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
        advertiserOfferService.depositToBalance(advertiserId, request.amount());
        return ResponseEntity.ok(ResponseDTO.ok("Баланс пополнен", null));
    }
}
