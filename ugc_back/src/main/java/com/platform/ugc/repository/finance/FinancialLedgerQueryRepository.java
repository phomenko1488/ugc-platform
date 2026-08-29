package com.platform.ugc.repository.finance;

// ASSUMPTION (see INTEGRATION_GUIDE.md, "Round 4"): this delivery could not read the real
// FinancialLedgerEntry class, so its package is guessed as com.platform.ugc.model.finance,
// following this codebase's existing model.<domain> convention (model.user, model.offer,
// model.submission). If your real entity lives elsewhere, this import is the only line that
// needs to change — everything else in this file is independent of the package name.
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Read-only access for the wallet's "История начислений" — one user's ledger rows, newest first.
 * Deliberately a separate, additive repository interface (same pattern as
 * {@code WorkerOfferStatsRepository} over {@code Submission}) rather than assuming a method with
 * this exact name/sort already exists on whatever repository the real
 * {@code FinancialSettlementEngine} writes through.
 * <p>
 * {@code findByUserIdOrderByCreatedAtDesc} assumes the entity has either a direct {@code userId}
 * property or a {@code user} association (Spring Data resolves "UserId" as {@code user.id} in
 * that case, same as {@code WorkerOfferStatsRepository}'s worker/offer id params resolve against
 * associations elsewhere in this codebase). If the real field is named differently (e.g.
 * {@code recipient}, {@code owner}), Spring fails loudly at startup with a
 * PropertyReferenceException naming this exact method — not a silent wrong-data bug.
 */
public interface FinancialLedgerQueryRepository extends JpaRepository<FinancialLedgerEntry, Long> {

    List<FinancialLedgerEntry> findByUserIdOrderByCreatedAtDesc(Long userId);
}
