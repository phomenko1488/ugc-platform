package com.platform.ugc.dto.admin;

import java.math.BigDecimal;
import java.util.List;

/**
 * Platform-wide P&L for the Admin Back-Office dashboard. {@code platformGrossTurnover} and
 * {@code platformNetProfit} are recomputed from "delivered" (APPROVED/PAID) submissions plus the
 * actual B2C/B2B commission ledger rows — the same convention {@code PartnerAnalyticsServiceImpl}
 * and {@code AdvertiserAnalyticsService} already use — rather than a dedicated
 * {@code PLATFORM_NET_PROFIT} ledger entry, since {@code FinancialSettlementEngine} never writes
 * one (that enum value exists but has never actually been recorded by anything in this codebase).
 */
public record AdminDashboardDTO(
        BigDecimal platformGrossTurnover,
        BigDecimal platformNetProfit,
        BigDecimal totalWorkersHoldLiability,
        BigDecimal totalAvailableUserBalances,
        long totalUsersCount,
        long totalSubmissionsCount,
        long activeOffersCount,
        long pendingPayoutsCount,
        BigDecimal pendingPayoutsAmount,
        List<DailyProfitPointDTO> profitTimeline
) {
}
