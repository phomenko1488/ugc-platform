package com.platform.ugc.model.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.*;

import java.math.BigDecimal;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralTerms {

    public enum RewardType {
        PERCENTAGE_OF_PAYOUT,
        FIXED_PER_MILLION,
        TIERED_VOLUME
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "b2c_reward_type", nullable = false, length = 32)
    @Builder.Default
    private RewardType rewardType = RewardType.PERCENTAGE_OF_PAYOUT;

    @Column(name = "b2c_rate", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal rate = new BigDecimal("3.00");

    @Column(name = "b2c_milestone_bonus", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal milestoneBonus = BigDecimal.ZERO;

    @Column(name = "b2c_is_custom", nullable = false)
    @Builder.Default
    private Boolean isCustomContract = false;
}