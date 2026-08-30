package com.platform.ugc.dto.admin;

import com.platform.ugc.model.user.B2BPartnerTerms;

import java.math.BigDecimal;

/**
 * General-purpose "edit user" shape from the ТЗ's DTO section. The actual endpoints
 * (PUT .../status, POST .../balance-adjust, PUT .../b2b-terms) each take their own narrower body
 * matching ugc-client's api/index.js calls exactly, so this record isn't wired to a single
 * controller method — it's kept for callers that want to describe "what changed" about a user as
 * one shape (e.g. an audit log, or a future combined edit endpoint) without duplicating field
 * definitions.
 */
public record AdminUserUpdateDTO(
        String role,
        Boolean isBanned,
        BigDecimal balanceAdjustment,
        String affiliateTag,
        B2BPartnerTerms customTerms
) {
}
