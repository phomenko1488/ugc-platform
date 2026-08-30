package com.platform.ugc.dto.admin;

import java.math.BigDecimal;

/**
 * One day of {@code AdminDashboardDTO.profitTimeline} — platform-wide gross ad turnover vs. actual
 * net profit (gross spread minus B2C/B2B commissions actually paid out that day).
 */
public record DailyProfitPointDTO(
        String date,
        BigDecimal grossTurnover,
        BigDecimal netProfit
) {
}
