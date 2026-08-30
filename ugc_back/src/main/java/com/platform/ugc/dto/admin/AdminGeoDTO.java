package com.platform.ugc.dto.admin;

import com.platform.ugc.model.offer.GeoCountry;

/** Full GEO reference row for AdminReferencePage, including the {@code isEnabled} toggle. */
public record AdminGeoDTO(
        Long id,
        String isoCode,
        String name,
        Integer tier,
        Boolean isEnabled
) {
    public static AdminGeoDTO fromEntity(GeoCountry g) {
        return new AdminGeoDTO(g.getId(), g.getIsoCode(), g.getName(), g.getTier(), g.getIsEnabled());
    }
}
