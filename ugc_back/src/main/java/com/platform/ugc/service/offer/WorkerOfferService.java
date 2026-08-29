package com.platform.ugc.service.offer;

import com.platform.ugc.dto.offer.WorkerOfferDetailsDTO;
import com.platform.ugc.dto.offer.WorkerOfferSubmissionDTO;
import com.platform.ugc.dto.offer.WorkerOfferSummaryDTO;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.WorkerOfferAssignment;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.WorkerOfferAssignmentRepository;
import com.platform.ugc.repository.submission.WorkerOfferStatsRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Backs the worker's "Взять оффер в работу" Workbench: which offers a worker has claimed, and
 * their personal progress (submissions/hold/approved totals) against each one.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkerOfferService {

    private static final String STATUS_TRACKING = "TRACKING";
    private static final String STATUS_APPROVED = "APPROVED";

    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final WorkerOfferAssignmentRepository assignmentRepository;
    private final WorkerOfferStatsRepository statsRepository;

    @Transactional
    public void takeOffer(Long workerId, Long offerId) {
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new WorkerOfferException("Пользователь не найден"));
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new WorkerOfferException("Оффер не найден"));

        if (!offer.getIsActive()) {
            throw new WorkerOfferException("Этот оффер сейчас не принимает новых воркеров");
        }

        WorkerOfferAssignment existing = assignmentRepository.findByWorkerIdAndOfferId(workerId, offerId).orElse(null);

        if (existing != null) {
            if (existing.isActive()) {
                return; // Already taken — idempotent, no error.
            }
            existing.setActive(true);
            existing.setJoinedAt(Instant.now());
            assignmentRepository.save(existing);
            log.info("Worker {} re-took offer {}", workerId, offerId);
            return;
        }

        assignmentRepository.save(WorkerOfferAssignment.builder()
                .worker(worker)
                .offer(offer)
                .joinedAt(Instant.now())
                .isActive(true)
                .build());
        log.info("Worker {} took offer {} into work", workerId, offerId);
    }

    @Transactional
    public void leaveOffer(Long workerId, Long offerId) {
        WorkerOfferAssignment assignment = assignmentRepository.findByWorkerIdAndOfferId(workerId, offerId)
                .filter(WorkerOfferAssignment::isActive)
                .orElseThrow(() -> new WorkerOfferException("Этот оффер не находится у вас в работе"));

        assignment.setActive(false);
        assignmentRepository.save(assignment);
        log.info("Worker {} left offer {} (submission history preserved)", workerId, offerId);
    }

    @Transactional(readOnly = true)
    public List<WorkerOfferSummaryDTO> getMyOffers(Long workerId) {
        return assignmentRepository.findAllByWorkerIdAndIsActiveTrue(workerId).stream()
                .map(assignment -> {
                    Offer offer = assignment.getOffer();
                    OfferStats stats = computeStats(workerId, offer.getId());
                    return WorkerOfferSummaryDTO.taken(
                            offer,
                            assignment.getJoinedAt(),
                            stats.count(),
                            stats.holdTotal(),
                            stats.approvedTotal()
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkerOfferSummaryDTO> getAllOffersForWorker(Long workerId) {
        Set<Long> takenOfferIds = assignmentRepository.findAllByWorkerIdAndIsActiveTrue(workerId).stream()
                .map(assignment -> assignment.getOffer().getId())
                .collect(Collectors.toSet());

        // Filtered in Java rather than via a repository method — this delivery couldn't confirm
        // whether OfferRepository already exposes an "active only" finder, so it only relies on
        // JpaRepository's guaranteed findAll().
        return offerRepository.findAll().stream()
                .filter(Offer::getIsActive)
                .map(offer -> WorkerOfferSummaryDTO.catalogEntry(offer, takenOfferIds.contains(offer.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Backs the worker's Offer Details Hub — full offer info plus this worker's own participation
     * status and submission history for it. Deliberately does NOT gate the history/aggregates on
     * {@code isTaken} or {@code offer.isActive()} — a worker who has left the offer, or an offer
     * an advertiser has since closed, should still show what that worker earned from it while it
     * ran; only the "take/submit/leave" action buttons care about those two flags, and that's a
     * frontend-side decision made from the fields returned here.
     */
    @Transactional(readOnly = true)
    public WorkerOfferDetailsDTO getOfferDetails(Long workerId, Long offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new WorkerOfferException("Оффер не найден"));

        WorkerOfferAssignment assignment = assignmentRepository.findByWorkerIdAndOfferId(workerId, offerId).orElse(null);
        boolean isTaken = assignment != null && assignment.isActive();
        Instant joinedAt = assignment != null ? assignment.getJoinedAt() : null;

        List<Submission> submissions = statsRepository.findAllByWorkerIdAndOfferId(workerId, offerId);

        long submissionsCount = submissions.size();
        long totalViews = submissions.stream()
                .map(Submission::getRecordedViews)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        BigDecimal holdTotal = sumByStatus(submissions, STATUS_TRACKING);
        BigDecimal earnedTotal = sumByStatus(submissions, STATUS_APPROVED);

        List<WorkerOfferSubmissionDTO> mySubmissions = submissions.stream()
                // Newest first — sorting by id rather than a createdAt field, since this delivery
                // couldn't confirm Submission exposes one; every JPA entity guarantees an id.
                .sorted(Comparator.comparing(Submission::getId).reversed())
                .map(WorkerOfferSubmissionDTO::from)
                .collect(Collectors.toList());

        return new WorkerOfferDetailsDTO(
                offer.getId(),
                offer.getTitle(),
                offer.getRequirementsDescription(),
                offer.getAdvertiserCpmRate(),
                offer.getWorkerCpmRate(),
                offer.getMinViewsThreshold(),
                offer.getMinEngagementRate(),
                offer.getTotalBudget(),
                offer.getRemainingBudget(),
                offer.getHoldPeriodDays(),
                offer.getAllowedPlatforms(),
                offer.getTargetGeos(),
                offer.getIsActive(),
                offer.getCreatedAt(),
                isTaken,
                joinedAt,
                submissionsCount,
                totalViews,
                holdTotal,
                earnedTotal,
                mySubmissions
        );
    }

    private OfferStats computeStats(Long workerId, Long offerId) {
        List<Submission> submissions = statsRepository.findAllByWorkerIdAndOfferId(workerId, offerId);

        long count = submissions.size();
        BigDecimal holdTotal = sumByStatus(submissions, STATUS_TRACKING);
        BigDecimal approvedTotal = sumByStatus(submissions, STATUS_APPROVED);

        return new OfferStats(count, holdTotal, approvedTotal);
    }

    private BigDecimal sumByStatus(List<Submission> submissions, String status) {
        return submissions.stream()
                .filter(s -> status.equals(String.valueOf(s.getStatus())))
                .map(Submission::getHoldAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private record OfferStats(long count, BigDecimal holdTotal, BigDecimal approvedTotal) {
    }
}
