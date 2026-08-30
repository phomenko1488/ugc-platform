package com.platform.ugc.service.finance;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.finance.FinancialLedgerResponseDTO;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialLedgerQueryService {

    private final FinancialLedgerRepository ledgerRepository;

    // Pagination initiative — the wallet's "История начислений" tab (Worker/Advertiser/Partner
    // cabinets alike), previously a bare unpaginated array.
    @Transactional(readOnly = true)
    public PageResponseDTO<FinancialLedgerResponseDTO> getLedgerForUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FinancialLedgerEntry> entries = ledgerRepository.findAllByUserId(userId, pageable);
        return PageResponseDTO.of(entries.map(this::toDto));
    }

    private FinancialLedgerResponseDTO toDto(FinancialLedgerEntry entry) {
        var submission = entry.getSubmission();
        var offer = entry.getOffer() != null ? entry.getOffer() : (submission != null ? submission.getOffer() : null);

        return new FinancialLedgerResponseDTO(
                entry.getId(),
                String.valueOf(entry.getEntryType()),
                entry.getAmount(),
                entry.getCreatedAt(),
                offer != null ? offer.getId() : null,
                offer != null ? offer.getTitle() : null,
                submission != null ? submission.getId() : null,
                submission != null ? submission.getSourceUrl() : null,
                submission != null && submission.getPlatform() != null ? submission.getPlatform().getCode() : null,
                entry.getRecordedViews() != null ? entry.getRecordedViews() : (submission != null ? submission.getRecordedViews() : null)
        );
    }
}