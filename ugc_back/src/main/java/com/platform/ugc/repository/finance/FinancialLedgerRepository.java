package com.platform.ugc.repository.finance;

import com.platform.ugc.model.finance.FinancialLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialLedgerRepository extends JpaRepository<FinancialLedgerEntry, Long> {
    List<FinancialLedgerEntry> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}