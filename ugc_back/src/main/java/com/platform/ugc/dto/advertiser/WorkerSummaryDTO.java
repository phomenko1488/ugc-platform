package com.platform.ugc.dto.advertiser;

import java.time.Instant;

/**
 * One row of the "workers currently in work" roster on the Campaign Detail Hub
 * ({@code AdvertiserCampaignDetailPage}) — built from a {@code WorkerOfferAssignment} plus that
 * worker's submission count on the same offer.
 */
public record WorkerSummaryDTO(
        Long id,
        String username,
        String affiliateTag,
        Instant joinedAt,
        long submissionsCount
) {
}
