package com.platform.ugc.dto.payout;

import com.platform.ugc.model.payout.Payout;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * One payout row as shown both to its own requester (Worker/Partner Wallet's "История выводов",
 * where {@code username}/{@code userEmail} are simply ignored by the frontend) and to the admin
 * Payout Desk (where they're the whole point of the table).
 */
public record PayoutResponseDTO(
        Long id,
        Long userId,
        String username,
        String userEmail,
        BigDecimal amount,
        String trc20Wallet,
        String status,
        String txHash,
        String comment,
        Instant createdAt,
        Instant updatedAt
) {
    public static PayoutResponseDTO fromEntity(Payout payout) {
        return new PayoutResponseDTO(
                payout.getId(),
                payout.getUser().getId(),
                payout.getUser().getUsername(),
                payout.getUser().getEmail(),
                payout.getAmount(),
                payout.getTrc20Wallet(),
                payout.getStatus().name(),
                payout.getTxHash(),
                payout.getComment(),
                payout.getCreatedAt(),
                payout.getUpdatedAt()
        );
    }
}
