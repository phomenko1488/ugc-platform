package com.platform.ugc.dto.admin;

/** {@code POST /api/v1/admin/reference/platforms} request body. */
public record PlatformCreateRequestDTO(
        String code,
        String displayName,
        String urlRegexPattern,
        String providerBeanName
) {
}
