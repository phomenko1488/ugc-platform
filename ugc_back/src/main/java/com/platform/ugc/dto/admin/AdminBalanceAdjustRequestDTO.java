package com.platform.ugc.dto.admin;

import java.math.BigDecimal;

/**
 * {@code POST /api/v1/admin/users/{userId}/balance-adjust} request body — {@code amount} is the
 * signed delta to apply (positive credit, negative debit), matching
 * {@code api.adjustUserBalance(userId, amount, comment)} in ugc-client's api/index.js.
 */
public record AdminBalanceAdjustRequestDTO(
        BigDecimal amount,
        String comment
) {
}
