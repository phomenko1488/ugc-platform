package com.platform.ugc.dto.integration;

import java.util.List;

/** Single bootstrap payload for the Advertiser Cabinet's "API и Интеграции" page. */
public record AdvertiserIntegrationsDTO(
        String postbackUrl,
        List<ApiTokenResponseDTO> tokens
) {
}
