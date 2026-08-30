package com.platform.ugc.dto.partner;

import java.math.BigDecimal;

/** One day of the Partner Dashboard's 30-day earnings trend chart. */
public record DailyPartnerEarningsDTO(
        String date,
        BigDecimal earnings,
        long deliveredViews
) {
}
