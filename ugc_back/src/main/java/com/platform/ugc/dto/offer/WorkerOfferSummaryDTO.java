package com.platform.ugc.dto.offer;

import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

/**
 * An offer as seen from one worker's Workbench: the standard Offer fields (serialized the same
 * shape the existing /offers/active endpoint already uses for allowedPlatforms/targetGeos, so the
 * frontend's existing OfferCard rendering keeps working unchanged) plus that worker's own
 * progress against it.
 * <p>
 * {@code joinedAt} / the three {@code my*} fields are only meaningful when {@code isTaken} is
 * true — {@link com.platform.ugc.service.offer.WorkerOfferService#getAllOffersForWorker} leaves
 * them null/zero for offers the worker hasn't taken.
 */
public record WorkerOfferSummaryDTO(
        Long id,
        String title,
        String requirementsDescription,
        BigDecimal advertiserCpmRate,
        BigDecimal workerCpmRate,
        Long minViewsThreshold,
        BigDecimal minEngagementRate,
        BigDecimal totalBudget,
        BigDecimal remainingBudget,
        Integer holdPeriodDays,
        Set<PlatformEntity> allowedPlatforms,
        Set<GeoCountry> targetGeos,
        boolean isActive,
        Instant joinedAt,
        long mySubmissionsCount,
        BigDecimal myHoldAmountTotal,
        BigDecimal myApprovedAmountTotal,
        boolean isTaken
) {

    public static WorkerOfferSummaryDTO taken(
            Offer offer,
            Instant joinedAt,
            long mySubmissionsCount,
            BigDecimal myHoldAmountTotal,
            BigDecimal myApprovedAmountTotal
    ) {
        return build(offer, joinedAt, mySubmissionsCount, myHoldAmountTotal, myApprovedAmountTotal, true);
    }

    public static WorkerOfferSummaryDTO notTaken(Offer offer) {
        return build(offer, null, 0L, BigDecimal.ZERO, BigDecimal.ZERO, false);
    }

    /**
     * For the catalog listing (getAllOffersForWorker) — carries just the isTaken flag, no
     * per-worker stats, so the catalog view doesn't pay for an aggregate query per row. The
     * frontend decides whether to render the mini-stats block by which tab is active, not by
     * whether these fields are zero, so this is safe to use even for offers the worker has taken.
     */
    public static WorkerOfferSummaryDTO catalogEntry(Offer offer, boolean isTaken) {
        return build(offer, null, 0L, BigDecimal.ZERO, BigDecimal.ZERO, isTaken);
    }

    private static WorkerOfferSummaryDTO build(
            Offer offer,
            Instant joinedAt,
            long mySubmissionsCount,
            BigDecimal myHoldAmountTotal,
            BigDecimal myApprovedAmountTotal,
            boolean isTaken
    ) {
        return new WorkerOfferSummaryDTO(
                offer.getId(),
                offer.getTitle(),
                offer.getRequirementsDescription(),
                offer.getAdvertiserCpmRate(),
                offer.getWorkerCpmRate(),
                offer.getMinViewsThreshold(),
                offer.getMinEngagementRate(),
                offer.getTotalBudget(),
                offer.getRemainingBudget(),
                offer.getHoldPeriodDays(),
                offer.getAllowedPlatforms(),
                offer.getTargetGeos(),
                offer.getIsActive(),
                joinedAt,
                mySubmissionsCount,
                myHoldAmountTotal,
                myApprovedAmountTotal,
                isTaken
        );
    }
}
