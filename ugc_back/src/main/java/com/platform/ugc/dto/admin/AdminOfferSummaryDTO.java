package com.platform.ugc.dto.admin;

import com.platform.ugc.model.offer.Offer;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One row of the platform-wide offer monitor (AdminOffersPage). The ТЗ names this page in the
 * frontend file tree ("Мониторинг всех офферов платформы и принудительная пауза") but doesn't
 * spell out a backend contract for it the way it does for every other admin page — this DTO plus
 * {@code AdminService#getAllOffers}/{@code #setOfferStatus} fill that gap using the same
 * advertiser/offer fields the rest of the platform already exposes, just flattened with the
 * advertiser's identity attached (which {@code OfferResponseDTO} alone doesn't carry).
 */
public record AdminOfferSummaryDTO(
        Long id,
        String title,
        Long advertiserId,
        String advertiserUsername,
        String advertiserEmail,
        BigDecimal advertiserCpmRate,
        BigDecimal workerCpmRate,
        BigDecimal totalBudget,
        BigDecimal remainingBudget,
        Boolean isActive,
        Instant createdAt
) {
    public static AdminOfferSummaryDTO fromEntity(Offer offer) {
        return new AdminOfferSummaryDTO(
                offer.getId(),
                offer.getTitle(),
                offer.getAdvertiser().getId(),
                offer.getAdvertiser().getUsername(),
                offer.getAdvertiser().getEmail(),
                offer.getAdvertiserCpmRate(),
                offer.getWorkerCpmRate(),
                offer.getTotalBudget(),
                offer.getRemainingBudget(),
                offer.getIsActive(),
                offer.getCreatedAt()
        );
    }
}
