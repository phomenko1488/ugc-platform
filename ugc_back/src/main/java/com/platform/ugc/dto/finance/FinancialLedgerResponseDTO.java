package com.platform.ugc.dto.finance;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One financial ledger row as shown to a user in their wallet history — flattened so the frontend
 * doesn't need to know about the offer/submission associations behind it. {@code offerId}/
 * {@code offerTitle} and the submission fields are null for ledger entries that predate this
 * delivery's {@code offer}/{@code submission}/{@code recordedViews} columns on
 * {@code FinancialLedgerEntry} (see INTEGRATION_GUIDE.md) — the frontend renders those rows
 * without the campaign/video detail instead of failing.
 */
public record FinancialLedgerResponseDTO(
        Long id,
        String type,
        BigDecimal amount,
        Instant createdAt,
        Long offerId,
        String offerTitle,
        Long submissionId,
        String sourceUrl,
        String platformCode,
        Long recordedViews
) {
}
