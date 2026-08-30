package com.platform.ugc.dto.admin;

import com.platform.ugc.model.offer.PlatformEntity;

/**
 * Full platform reference row for AdminReferencePage — unlike the public
 * {@code OfferResponseDTO.PlatformDto} (id/code/displayName only, and only ever the enabled ones),
 * this carries the regex pattern, provider bean name and enabled flag the admin table edits.
 */
public record AdminPlatformDTO(
        Long id,
        String code,
        String displayName,
        String urlRegexPattern,
        String providerBeanName,
        Boolean isEnabled
) {
    public static AdminPlatformDTO fromEntity(PlatformEntity p) {
        return new AdminPlatformDTO(p.getId(), p.getCode(), p.getDisplayName(), p.getUrlRegexPattern(), p.getProviderBeanName(), p.getIsEnabled());
    }
}
