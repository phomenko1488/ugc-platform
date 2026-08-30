package com.platform.ugc.dto.admin;

import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.offer.Offer;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One row of the global platform ledger feed ({@code GET /api/v1/admin/ledger}) — same flattened
 * shape as {@code FinancialLedgerResponseDTO} (the per-user wallet history), plus who the entry
 * belongs to, since this feed spans every user on the platform at once.
 */
public record AdminLedgerEntryDTO(
        Long id,
        Long userId,
        String username,
        String type,
        BigDecimal amount,
        String description,
        Instant createdAt,
        Long offerId,
        String offerTitle
) {
    public static AdminLedgerEntryDTO fromEntity(FinancialLedgerEntry entry) {
        Offer offer = entry.getOffer() != null
                ? entry.getOffer()
                : (entry.getSubmission() != null ? entry.getSubmission().getOffer() : null);
        return new AdminLedgerEntryDTO(
                entry.getId(),
                entry.getUser().getId(),
                entry.getUser().getUsername(),
                entry.getEntryType().name(),
                entry.getAmount(),
                entry.getDescription(),
                entry.getCreatedAt(),
                offer != null ? offer.getId() : null,
                offer != null ? offer.getTitle() : null
        );
    }
}
