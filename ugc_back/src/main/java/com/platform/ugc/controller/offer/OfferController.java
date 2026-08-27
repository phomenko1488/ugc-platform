package com.platform.ugc.controller.offer;

import com.platform.ugc.dto.ResponseDTO;
import com.platform.ugc.dto.offer.OfferCreateRequestDTO;
import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.service.offer.OfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;

    @PostMapping
    public ResponseEntity<ResponseDTO<OfferResponseDTO>> createOffer(
            @RequestParam Long advertiserId,
            @Valid @RequestBody OfferCreateRequestDTO request
    ) {
        Offer offer = offerService.createOffer(advertiserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.ok("Оффер успешно создан", OfferResponseDTO.fromEntity(offer)));
    }

    @GetMapping("/active")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO>>> getActiveOffers() {
        return ResponseEntity.ok(ResponseDTO.ok(offerService.getActiveOffersForWorkers()));
    }

    @GetMapping("/advertiser/{advertiserId}")
    public ResponseEntity<ResponseDTO<List<OfferResponseDTO>>> getOffersByAdvertiser(@PathVariable Long advertiserId) {
        return ResponseEntity.ok(ResponseDTO.ok(offerService.getOffersByAdvertiser(advertiserId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO<OfferResponseDTO>> getOfferById(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.ok(offerService.getOfferDetails(id)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ResponseDTO<Void>> setStatus(
            @PathVariable Long id,
            @RequestParam Long advertiserId,
            @RequestParam boolean isActive
    ) {
        offerService.setOfferActiveStatus(id, advertiserId, isActive);
        return ResponseEntity.ok(ResponseDTO.ok("Статус оффера обновлен", null));
    }

    @PostMapping("/{id}/topup")
    public ResponseEntity<ResponseDTO<Void>> topUpBudget(
            @PathVariable Long id,
            @RequestParam Long advertiserId,
            @RequestParam BigDecimal amount
    ) {
        offerService.topUpOfferBudget(id, advertiserId, amount);
        return ResponseEntity.ok(ResponseDTO.ok("Бюджет оффера пополнен", null));
    }
}