package com.platform.ugc.dto.advertiser;

import java.time.LocalDate;

/**
 * One point on the Advertiser Dashboard's 30-day reach chart. Zero-filled by
 * {@code AdvertiserAnalyticsService} for days with no submissions, so the frontend can draw a
 * continuous timeline without doing its own gap-filling.
 */
public record DailyViewsDTO(LocalDate date, long views) {
}
