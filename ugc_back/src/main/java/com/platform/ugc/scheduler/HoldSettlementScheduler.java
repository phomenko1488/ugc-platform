package com.platform.ugc.scheduler;

import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.service.finance.FinancialSettlementEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class HoldSettlementScheduler {

    private final SubmissionRepository submissionRepository;
    private final FinancialSettlementEngine settlementEngine;
    private final PlatformTransactionManager transactionManager;

    @Scheduled(fixedDelay = 60000)
    public void settleExpiredHolds() {
        // 1. Выбираем ID сабмитов, чей срок холда истек
        List<Submission> expiredSubmissions = submissionRepository.findAllByStatusOrderByCreatedAtAsc(Submission.Status.TRACKING);
        Instant now = Instant.now();

        List<Long> idsToSettle = expiredSubmissions.stream()
                .filter(s -> s.getHoldExpiresAt() != null && s.getHoldExpiresAt().isBefore(now))
                .map(Submission::getId)
                .toList();

        if (idsToSettle.isEmpty()) {
            return;
        }

        log.info("HoldSettlementScheduler: найдено {} сабмитов для авторазморозки", idsToSettle.size());

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // 2. Каждый сабмит обрабатывается в своей отдельной изолированной транзакции
        for (Long id : idsToSettle) {
            try {
                transactionTemplate.executeWithoutResult(status -> settleOne(id));
                log.info("HoldSettlementScheduler: успешно разморожен сабмит #{}", id);
            } catch (Exception e) {
                log.error("HoldSettlementScheduler: ошибка авторазморозки сабмита #{}: {}", id, e.getMessage(), e);
            }
        }
    }

    private void settleOne(Long id) {
        Submission submission = submissionRepository.findByIdWithLock(id)
                .orElseThrow(() -> new IllegalArgumentException("Сабмит не найден: " + id));

        if (submission.getStatus() != Submission.Status.TRACKING) {
            return; // Статус уже изменился (например, был оспорен)
        }

        submission.setStatus(Submission.Status.APPROVED);
        submission.setModerationComment("Автоматическая выплата по истечении периода холда");

        settlementEngine.executeSettlement(submission);
        submissionRepository.save(submission);
    }
}