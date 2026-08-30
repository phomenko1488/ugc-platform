package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One day of the Analytics Hub's views/spend trend chart. */
public record DailyAnalyticsPointDTO(
        LocalDate date,
        long views,
        BigDecimal spend,
        long submissionsCount
) {
}
