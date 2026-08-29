package com.platform.ugc.dto.advertiser;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Body for {@code POST /api/v1/advertiser/{advertiserId}/deposit} — the Billing page's simulated
 * USDT TRC-20 top-up. No real payment rail is wired up yet; this just credits
 * {@code availableBalance} and records an {@code ADVERTISER_DEPOSIT} ledger entry, same as an
 * operator manually crediting a client would.
 */
public record DepositRequestDTO(
        @NotNull(message = "Сумма пополнения обязательна")
        @DecimalMin(value = "0.01", message = "Сумма пополнения должна быть больше 0")
        BigDecimal amount
) {}
