package com.platform.ugc.dto.admin;

/** {@code POST /api/v1/admin/reference/geos} request body. */
public record GeoCreateRequestDTO(
        String isoCode,
        String name,
        Integer tier
) {
}
