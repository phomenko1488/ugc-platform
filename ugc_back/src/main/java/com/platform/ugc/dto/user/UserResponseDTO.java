package com.platform.ugc.dto.user;

import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

public record UserResponseDTO(
        Long id,
        Long telegramId,
        String email,
        String username,
        Set<Role> roles,
        BigDecimal availableBalance,
        BigDecimal holdBalance,
        BigDecimal referralEarnedTotal,
        String trc20Wallet,
        Integer trustLevel,
        String affiliateTag,
        Boolean isBanned,
        Instant createdAt
) {
    public static UserResponseDTO fromEntity(User user) {
        return new UserResponseDTO(
                user.getId(),
                user.getTelegramId(),
                user.getEmail(),
                user.getUsername(),
                user.getRoles(),
                user.getAvailableBalance(),
                user.getHoldBalance(),
                user.getReferralEarnedTotal(),
                user.getTrc20Wallet(),
                user.getTrustLevel(),
                user.getAffiliateTag(),
                user.getIsBanned(),
                user.getCreatedAt()
        );
    }
}