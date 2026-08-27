package com.platform.ugc.port.stats;

public interface PlatformStatsProvider {
    VideoStatsPayload extractMetrics(String sourceUrl, String externalId);
}