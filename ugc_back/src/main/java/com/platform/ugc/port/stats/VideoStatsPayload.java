package com.platform.ugc.port.stats;

import java.math.BigDecimal;

public record VideoStatsPayload(
        String externalId,
        String author,
        long views,
        long likes,
        long comments,
        BigDecimal engagementRate,
        String rawDescriptionText
) {}