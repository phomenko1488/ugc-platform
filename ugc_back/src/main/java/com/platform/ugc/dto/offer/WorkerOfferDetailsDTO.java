package com.platform.ugc.dto.offer;

import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.PlatformEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * The full "Offer Details Hub" a worker sees on {@code /offers/{offerId}/details?workerId=...} —
 * the offer's own fields, this specific worker's participation status, their aggregate progress,
 * and their full submission history for it. The history/aggregates are populated regardless of
 * whether {@code isActive} is true or the worker has since left the offer (isTaken=false) — a
 * worker who left after submitting videos should still see what they earned from it.
 */
public record WorkerOfferDetailsDTO(
        Long id,
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
        Set<PlatformEntity> allowedPlatforms,
        Set<GeoCountry> targetGeos,
        boolean isActive,
        Instant createdAt,
        String mediaKitUrl,
        Set<String> brandAssetUrls,
        boolean isTaken,
        Instant joinedAt,
        long mySubmissionsCount,
        long myTotalViews,
        BigDecimal myHoldAmountTotal,
        BigDecimal myEarnedAmountTotal,
        List<WorkerOfferSubmissionDTO> mySubmissions
) {
}
