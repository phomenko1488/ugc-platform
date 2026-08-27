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
public class B2BPartnerTerms {

    public enum CommissionType {
        PERCENT_OF_PLATFORM_MARGIN,
        PERCENT_OF_GROSS_TURNOVER,
        FIXED_PER_QUALIFIED_MILLION
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "b2b_commission_type", nullable = false, length = 32)
    @Builder.Default
    private CommissionType commissionType = CommissionType.PERCENT_OF_PLATFORM_MARGIN;

    @Column(name = "b2b_commission_rate", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal commissionRate = new BigDecimal("20.00");

    @Column(name = "b2b_is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}