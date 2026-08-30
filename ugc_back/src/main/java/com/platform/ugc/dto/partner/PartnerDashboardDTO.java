package com.platform.ugc.dto.partner;

import com.platform.ugc.model.user.B2BPartnerTerms;

import java.math.BigDecimal;
import java.util.List;

/** {@code GET /api/v1/partner/{partnerId}/dashboard} — the Partner Cabinet's landing KPI page. */
public record PartnerDashboardDTO(
        BigDecimal availableBalance,
        BigDecimal totalEarned,
        long referredAdvertisersCount,
        long activeOffersCount,
        long totalDeliveredViews,
        BigDecimal totalGrossTurnover,
        B2BPartnerTerms currentTerms,
        List<DailyPartnerEarningsDTO> earningsTimeline
) {
}
