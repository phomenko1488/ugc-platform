package com.platform.ugc.dto.advertiser;

import com.platform.ugc.dto.submission.SubmissionResponseDTO;

import java.math.BigDecimal;
import java.util.List;

/**
 * Top-level payload for {@code GET /api/v1/advertiser/{advertiserId}/dashboard} — the KPI cards,
 * 30-day reach chart and top-5 videos shown on {@code AdvertiserDashboardPage}.
 */
public record AdvertiserDashboardDTO(
        BigDecimal availableBalance,
        BigDecimal activeOffersBudgetTotal,
        BigDecimal totalSpent,
        long totalRecordedViews,
        long activeOffersCount,
        BigDecimal averageCpmRate,
        BigDecimal averageEngagementRate,
        List<DailyViewsDTO> viewsTimeline,
        List<SubmissionResponseDTO> topSubmissions
) {
}
