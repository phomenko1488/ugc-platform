package com.platform.ugc.dto.setting;

import com.platform.ugc.model.setting.PlatformSettings;

import java.math.BigDecimal;

/**
 * {@code GET /api/v1/reference/settings} payload — lets the Offer Wizard compute the worker
 * payout and platform margin live as the advertiser types their CPM bid, instead of hardcoding
 * the 25% the backend actually applies at {@code POST /api/v1/offers}.
 */
public record PlatformSettingsDTO(BigDecimal defaultMarginPercentage) {
    public static PlatformSettingsDTO fromEntity(PlatformSettings settings) {
        return new PlatformSettingsDTO(settings.getDefaultMarginPercentage());
    }
}
