package com.platform.ugc.controller.offer;

import com.platform.ugc.dto.common.ApiEnvelope;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.offer.WorkerOfferDetailsDTO;
import com.platform.ugc.dto.offer.WorkerOfferSummaryDTO;
import com.platform.ugc.service.offer.WorkerOfferException;
import com.platform.ugc.service.offer.WorkerOfferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Взять оффер в работу" — the worker Workbench endpoints.
 * <p>
 * Mounted at the same {@code /api/v1/offers} base as the existing OfferController, but on
 * entirely new sub-paths ({@code /take}, {@code /leave}, {@code /my}, {@code /catalog}) so it
 * can be dropped in as a second controller bean without touching or colliding with the existing
 * one. See INTEGRATION_GUIDE.md for why {@code /catalog} exists instead of overloading the ТЗ's
 * originally-specified {@code GET /offers/active?workerId=} — that exact path/method combo is
 * already handled by the real, unread OfferController, and Spring refuses to start with two
 * handlers mapped to the same route.
 * <p>
 * Auth: takes {@code workerId} as a request param for now, matching how the rest of this
 * (pre-Module-1) codebase's endpoints already pass ids explicitly rather than reading
 * {@code @AuthenticationPrincipal} — see INTEGRATION_GUIDE.md if you'd rather derive it from the
 * JWT instead once the wider codebase does the same everywhere.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/offers")
@RequiredArgsConstructor
public class WorkerOfferController {

    private final WorkerOfferService workerOfferService;

    @PostMapping("/{offerId}/take")
    public ResponseEntity<ApiEnvelope<Void>> takeOffer(
            @PathVariable Long offerId,
            @RequestParam Long workerId
    ) {
        try {
            workerOfferService.takeOffer(workerId, offerId);
            return ResponseEntity.ok(ApiEnvelope.<Void>ok(null));
        } catch (WorkerOfferException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiEnvelope.error(e.getMessage()));
        }
    }

    @PostMapping("/{offerId}/leave")
    public ResponseEntity<ApiEnvelope<Void>> leaveOffer(
            @PathVariable Long offerId,
            @RequestParam Long workerId
    ) {
        try {
            workerOfferService.leaveOffer(workerId, offerId);
            return ResponseEntity.ok(ApiEnvelope.<Void>ok(null));
        } catch (WorkerOfferException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiEnvelope.error(e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiEnvelope<PageResponseDTO<WorkerOfferSummaryDTO>>> getMyOffers(
            @RequestParam Long workerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiEnvelope.ok(workerOfferService.getMyOffers(workerId, page, size)));
    }

    @GetMapping("/catalog")
    public ResponseEntity<ApiEnvelope<PageResponseDTO<WorkerOfferSummaryDTO>>> getCatalog(
            @RequestParam Long workerId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String platform,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiEnvelope.ok(workerOfferService.getAllOffersForWorker(workerId, search, platform, page, size)));
    }

    @GetMapping("/{offerId}/details")
    public ResponseEntity<ApiEnvelope<WorkerOfferDetailsDTO>> getOfferDetails(
            @PathVariable Long offerId,
            @RequestParam Long workerId
    ) {
        try {
            return ResponseEntity.ok(ApiEnvelope.ok(workerOfferService.getOfferDetails(workerId, offerId)));
        } catch (WorkerOfferException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiEnvelope.error(e.getMessage()));
        }
    }
}
