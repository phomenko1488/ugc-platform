package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;

/** One row of the Analytics Hub's top-10 creators leaderboard for the selected period. */
public record TopCreatorDTO(
        Long workerId,
        String username,
        String affiliateTag,
        long viewsDelivered,
        BigDecimal earningsEarned,
        long approvedCount
) {
}
