package com.platform.ugc.dto.offer;

import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

public record OfferResponseDTO(
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
        Set<PlatformDto> allowedPlatforms,
        Set<GeoDto> targetGeos,
        String mediaKitUrl,
        Set<String> brandAssetUrls,
        Instant createdAt
) {
    public record PlatformDto(Long id, String code, String displayName) {
        public static PlatformDto fromEntity(PlatformEntity p) {
            return new PlatformDto(p.getId(), p.getCode(), p.getDisplayName());
        }
    }

    public record GeoDto(Long id, String isoCode, String name, Integer tier) {
        public static GeoDto fromEntity(GeoCountry g) {
            return new GeoDto(g.getId(), g.getIsoCode(), g.getName(), g.getTier());
        }
    }

    public static OfferResponseDTO fromEntity(Offer offer) {
        return new OfferResponseDTO(
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
                offer.getAllowedPlatforms().stream().map(PlatformDto::fromEntity).collect(Collectors.toSet()),
                offer.getTargetGeos().stream().map(GeoDto::fromEntity).collect(Collectors.toSet()),
                offer.getMediaKitUrl(),
                offer.getBrandAssetUrls(),
                offer.getCreatedAt()
        );
    }
}