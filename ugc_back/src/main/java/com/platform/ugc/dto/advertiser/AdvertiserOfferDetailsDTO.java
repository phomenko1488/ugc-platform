package com.platform.ugc.dto.advertiser;

import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.model.offer.Offer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Campaign Detail Hub payload for {@code GET /api/v1/advertiser/{advertiserId}/offers/{offerId}/details}
 * — the standard offer fields plus the in-progress-work metrics {@code AdvertiserCampaignDetailPage}
 * needs (workers currently on the offer, submission funnel counts, budget already spent).
 */
public record AdvertiserOfferDetailsDTO(
        Long id,
        Long advertiserId,
        String title,
        String requirementsDescription,
        BigDecimal advertiserCpmRate,
        BigDecimal workerCpmRate,
        Long minViewsThreshold,
        Long maxViewsCapPerVideo,
        BigDecimal minEngagementRate,
        BigDecimal totalBudget,
        BigDecimal remainingBudget,
        Integer holdPeriodDays,
        Boolean isActive,
        Set<OfferResponseDTO.PlatformDto> allowedPlatforms,
        Set<OfferResponseDTO.GeoDto> targetGeos,
        String mediaKitUrl,
        Set<String> brandAssetUrls,
        Instant createdAt,
        long workersInWorkCount,
        long totalSubmissionsCount,
        long approvedSubmissionsCount,
        BigDecimal budgetSpent,
        List<WorkerSummaryDTO> activeWorkers
) {
    public static AdvertiserOfferDetailsDTO fromEntity(
            Offer offer,
            long workersInWorkCount,
            long totalSubmissionsCount,
            long approvedSubmissionsCount,
            List<WorkerSummaryDTO> activeWorkers
    ) {
        Set<OfferResponseDTO.PlatformDto> platforms = offer.getAllowedPlatforms().stream()
                .map(OfferResponseDTO.PlatformDto::fromEntity)
                .collect(Collectors.toSet());
        Set<OfferResponseDTO.GeoDto> geos = offer.getTargetGeos().stream()
                .map(OfferResponseDTO.GeoDto::fromEntity)
                .collect(Collectors.toSet());

        return new AdvertiserOfferDetailsDTO(
                offer.getId(),
                offer.getAdvertiser().getId(),
                offer.getTitle(),
                offer.getRequirementsDescription(),
                offer.getAdvertiserCpmRate(),
                offer.getWorkerCpmRate(),
                offer.getMinViewsThreshold(),
                offer.getMaxViewsCapPerVideo(),
                offer.getMinEngagementRate(),
                offer.getTotalBudget(),
                offer.getRemainingBudget(),
                offer.getHoldPeriodDays(),
                offer.getIsActive(),
                platforms,
                geos,
                offer.getMediaKitUrl(),
                offer.getBrandAssetUrls(),
                offer.getCreatedAt(),
                workersInWorkCount,
                totalSubmissionsCount,
                approvedSubmissionsCount,
                offer.getTotalBudget().subtract(offer.getRemainingBudget()),
                activeWorkers
        );
    }
}
