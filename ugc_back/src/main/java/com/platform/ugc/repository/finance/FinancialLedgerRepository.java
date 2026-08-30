package com.platform.ugc.repository.finance;

import com.platform.ugc.model.finance.FinancialLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialLedgerRepository extends JpaRepository<FinancialLedgerEntry, Long> {
    List<FinancialLedgerEntry> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    // Partner Cabinet — a partner's own B2B_PARTNER_COMMISSION rows, for both the dashboard's
    // total-earned/30-day-timeline figures and (grouped by the entry's offer.advertiser) the
    // per-advertiser breakdown in getReferredAdvertisers().
    List<FinancialLedgerEntry> findAllByUserIdAndEntryType(Long userId, FinancialLedgerEntry.EntryType entryType);

    // Admin Back-Office — every row of one entry type across ALL users at once, for the dashboard's
    // platform-wide P&L (summing B2C_REFERRAL_COMMISSION / B2B_PARTNER_COMMISSION actually paid
    // out) rather than per-user.
    List<FinancialLedgerEntry> findAllByEntryType(FinancialLedgerEntry.EntryType entryType);

    // Admin Back-Office — the global, paginated "лента всех финансовых транзакций платформы"
    // (GET /api/v1/admin/ledger), optionally narrowed to one entry type.
    Page<FinancialLedgerEntry> findAllByEntryType(FinancialLedgerEntry.EntryType entryType, Pageable pageable);

    // Pagination initiative — the wallet's paginated "История начислений" tab
    // (GET /api/v1/users/{userId}/ledger), used by the Worker, Advertiser and Partner cabinets alike.
    Page<FinancialLedgerEntry> findAllByUserId(Long userId, Pageable pageable);
}