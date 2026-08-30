package com.platform.ugc.dto.admin;

/**
 * Request body for both {@code POST /api/v1/admin/payouts/{id}/complete} ({@code txHash} set,
 * {@code comment} ignored) and {@code POST /api/v1/admin/payouts/{id}/reject} ({@code comment}
 * set, {@code txHash} ignored) — one shape for both actions, per the ТЗ's DTO section.
 */
public record AdminPayoutActionDTO(
        String txHash,
        String comment
) {
}
