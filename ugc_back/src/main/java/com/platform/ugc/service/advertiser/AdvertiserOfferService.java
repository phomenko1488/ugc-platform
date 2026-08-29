package com.platform.ugc.service.advertiser;

import com.platform.ugc.dto.advertiser.AdvertiserOfferDetailsDTO;
import com.platform.ugc.dto.advertiser.WorkerSummaryDTO;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.WorkerOfferAssignment;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.WorkerOfferAssignmentRepository;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backs the Campaign Detail Hub ({@code AdvertiserCampaignDetailPage}) and the Billing page's
 * top-up: per-offer drill-down data, stopping a campaign early with a budget refund, and the
 * simulated USDT top-up flow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdvertiserOfferService {

    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final WorkerOfferAssignmentRepository workerOfferAssignmentRepository;
    private final FinancialLedgerRepository financialLedgerRepository;

    @Transactional(readOnly = true)
    public AdvertiserOfferDetailsDTO getOfferDetails(Long advertiserId, Long offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));
        requireOwnership(offer, advertiserId);

        List<WorkerOfferAssignment> activeAssignments = workerOfferAssignmentRepository.findAllByOfferIdAndIsActiveTrue(offerId);
        List<Submission> submissions = submissionRepository.findAllByOfferIdOrderByCreatedAtDesc(offerId);

        Map<Long, Long> submissionCountByWorker = submissions.stream()
                .collect(Collectors.groupingBy(s -> s.getWorker().getId(), Collectors.counting()));

        long approvedSubmissionsCount = submissions.stream()
                .filter(s -> s.getStatus() == Submission.Status.APPROVED || s.getStatus() == Submission.Status.PAID)
                .count();

        List<WorkerSummaryDTO> activeWorkers = activeAssignments.stream()
                .map(assignment -> new WorkerSummaryDTO(
                        assignment.getWorker().getId(),
                        assignment.getWorker().getUsername(),
                        assignment.getWorker().getAffiliateTag(),
                        assignment.getJoinedAt(),
                        submissionCountByWorker.getOrDefault(assignment.getWorker().getId(), 0L)
                ))
                .toList();

        return AdvertiserOfferDetailsDTO.fromEntity(
                offer,
                activeAssignments.size(),
                submissions.size(),
                approvedSubmissionsCount,
                activeWorkers
        );
    }

    @Transactional
    public void stopOffer(Long advertiserId, Long offerId) {
        Offer offer = offerRepository.findByIdWithLock(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));
        requireOwnership(offer, advertiserId);

        if (!Boolean.TRUE.equals(offer.getIsActive())) {
            // Already stopped — idempotent no-op so a retried request never double-refunds.
            return;
        }

        BigDecimal refundAmount = offer.getRemainingBudget();

        offer.setRemainingBudget(BigDecimal.ZERO);
        offer.setIsActive(false);
        offerRepository.save(offer);

        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            User advertiser = userRepository.findByIdWithLock(advertiserId)
                    .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));
            advertiser.setAvailableBalance(advertiser.getAvailableBalance().add(refundAmount));
            userRepository.save(advertiser);

            financialLedgerRepository.save(FinancialLedgerEntry.builder()
                    .user(advertiser)
                    .offer(offer)
                    .entryType(FinancialLedgerEntry.EntryType.ADVERTISER_BUDGET_REFUND)
                    .amount(refundAmount)
                    .description("Возврат неиспользованного бюджета кампании «" + offer.getTitle() + "»")
                    .build());
        }

        log.info("Оффер остановлен [ID: {}, Advertiser: {}, Refunded: ${}]", offerId, advertiserId, refundAmount);
    }

    @Transactional
    public void depositToBalance(Long advertiserId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Сумма пополнения должна быть больше 0.");
        }

        User advertiser = userRepository.findByIdWithLock(advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));

        advertiser.setAvailableBalance(advertiser.getAvailableBalance().add(amount));
        userRepository.save(advertiser);

        financialLedgerRepository.save(FinancialLedgerEntry.builder()
                .user(advertiser)
                .entryType(FinancialLedgerEntry.EntryType.ADVERTISER_DEPOSIT)
                .amount(amount)
                .description("Пополнение баланса (USDT TRC-20, симуляция)")
                .build());
    }

    private void requireOwnership(Offer offer, Long advertiserId) {
        if (!offer.getAdvertiser().getId().equals(advertiserId)) {
            throw new AccessDeniedException("Нет доступа к офферу.");
        }
    }
}
