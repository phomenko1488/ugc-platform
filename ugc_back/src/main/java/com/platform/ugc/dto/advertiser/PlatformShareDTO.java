package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;

/**
 * One row of the Analytics Hub's platform breakdown (TikTok vs YouTube Shorts vs Instagram
 * Reels) — confirmed views and gross spend attributed to that platform's submissions in the
 * selected period, plus that platform's share of the period's total confirmed views.
 */
public record PlatformShareDTO(
        String platformCode,
        String displayName,
        long views,
        BigDecimal spend,
        BigDecimal sharePercentage
) {
}
