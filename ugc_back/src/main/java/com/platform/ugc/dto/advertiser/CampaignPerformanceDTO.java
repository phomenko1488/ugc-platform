package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;

/** One row of the Analytics Hub's campaign-comparison matrix for the selected period. */
public record CampaignPerformanceDTO(
        Long offerId,
        String title,
        BigDecimal spend,
        long views,
        long submissionsCount,
        BigDecimal disputeRatePercentage
) {
}
