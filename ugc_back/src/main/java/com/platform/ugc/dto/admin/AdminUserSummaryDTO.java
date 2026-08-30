package com.platform.ugc.dto.admin;

import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

/**
 * One row of the Admin CRM (AdminUsersPage) — every field the table and its UserEditModal need,
 * including {@code b2bPartnerTerms} so the modal can prefill the RevShare form when the row being
 * edited is a partner (the terms are meaningless, and simply ignored client-side, for anyone else).
 */
public record AdminUserSummaryDTO(
        Long id,
        String username,
        String email,
        String affiliateTag,
        Set<Role> roles,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        Boolean isBanned,
        Instant createdAt,
        B2BPartnerTerms b2bPartnerTerms
) {
    public static AdminUserSummaryDTO fromEntity(User user) {
        return new AdminUserSummaryDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAffiliateTag(),
                user.getRoles(),
                user.getAvailableBalance(),
                user.getHoldBalance(),
                user.getIsBanned(),
                user.getCreatedAt(),
                user.getB2bPartnerTerms()
        );
    }
}
