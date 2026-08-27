package com.platform.ugc.adapter.stats;

import com.platform.ugc.port.stats.PlatformStatsProvider;
import com.platform.ugc.port.stats.VideoStatsPayload;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component("genericSocialStatsProvider")
public class GenericSocialStatsProvider implements PlatformStatsProvider {

    @Override
    public VideoStatsPayload extractMetrics(String sourceUrl, String externalId) {
        // Fallback провайдер для эмуляции/тестовых запусков без API ключей
        return new VideoStatsPayload(
                externalId,
                "Creator_" + externalId,
                100_000L,
                4_500L,
                150L,
                new BigDecimal("4.50"),
                "Clip for contest #wrk_777 #wrk_888"
        );
    }
}