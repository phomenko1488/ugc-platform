package com.platform.ugc.dto.partner;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One row of the Partner CRM ({@code PartnerAdvertisersPage}) — a brand/casino attached to this
 * partner ({@code User.b2bPartner == this partner}), with the partner's own take from that one
 * client broken out separately from the client's overall spend.
 */
public record PartnerAdvertiserSummaryDTO(
        Long id,
        String username,
        String email,
        String affiliateTag,
        Instant registeredAt,
        long activeOffersCount,
        long totalDeliveredViews,
        BigDecimal totalSpent,
        BigDecimal partnerEarnedFromThisAdvertiser
) {
}
