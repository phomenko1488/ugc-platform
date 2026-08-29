package com.platform.ugc.service.finance;

import com.platform.ugc.dto.finance.FinancialLedgerResponseDTO;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialLedgerQueryService {

    private final FinancialLedgerRepository ledgerRepository;

    @Transactional(readOnly = true)
    public List<FinancialLedgerResponseDTO> getLedgerForUser(Long userId) {
        return ledgerRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
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