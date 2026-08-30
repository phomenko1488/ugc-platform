package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Payload for the Advertiser Analytics Hub — {@code GET /api/v1/advertiser/{advertiserId}/analytics?from&to}.
 * {@code from}/{@code to} echo back the resolved (possibly defaulted) date range so the frontend's
 * filter UI stays in sync with what the numbers actually cover.
 * <p>
 * The campaign-comparison table used to live here as {@code campaignComparison} but was split out
 * (pagination initiative) into its own paginated endpoint —
 * {@code GET /api/v1/advertiser/{advertiserId}/analytics/campaigns} — since it's the one part of
 * this payload that grows with an advertiser's campaign count rather than staying a fixed-size
 * summary.
 */
public record AdvertiserDeepAnalyticsDTO(
        LocalDate from,
        LocalDate to,
        BigDecimal totalGrossSpent,
        long totalDeliveredViews,
        BigDecimal effectiveCpm,
        BigDecimal averageEngagementRate,
        long totalInteractions,
        List<PlatformShareDTO> platformBreakdown,
        List<GeoShareDTO> geoBreakdown,
        List<TopCreatorDTO> topCreators,
        List<DailyAnalyticsPointDTO> dailyTrends
) {
}
