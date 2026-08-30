package com.platform.ugc.dto.advertiser;

import java.math.BigDecimal;

/**
 * One row of the Analytics Hub's GEO breakdown.
 * <p>
 * ASSUMPTION: {@code Submission} has no per-video GEO field — a worker never declares which
 * country their traffic came from, only the {@code Offer} declares a set of *target* GEOs. So a
 * submission's views are split evenly across its offer's {@code targetGeos} (3 target countries
 * → each credited 1/3 of that submission's views) rather than attributed to one real country.
 * This is a reasonable approximation given the data actually captured today, not a precise
 * per-video geo measurement — flagged here so it isn't mistaken for one later.
 */
public record GeoShareDTO(
        String isoCode,
        String name,
        long views,
        BigDecimal sharePercentage
) {
}
