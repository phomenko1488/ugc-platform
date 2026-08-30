package com.platform.ugc.service.submission.impl;

import com.platform.ugc.adapter.stats.DynamicStatsProviderRegistry;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.submission.SubmissionCreateRequestDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.User;
import com.platform.ugc.port.stats.VideoStatsPayload;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.email.EmailService;
import com.platform.ugc.service.finance.FinancialSettlementEngine;
import com.platform.ugc.service.submission.SubmissionService;
import com.platform.ugc.telegram.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final PlatformRepository platformRepository;
    private final DynamicStatsProviderRegistry statsRegistry;
    private final FinancialSettlementEngine settlementEngine;
    private final TelegramNotificationService telegramNotificationService;
    private final EmailService emailService;

    // Advertiser Telegram/email low-budget alert fires once remaining budget drops under this
    // share of the offer's total budget.
    private static final BigDecimal LOW_BUDGET_THRESHOLD_PERCENT = new BigDecimal("15");

    @Override
    @Transactional
    public Submission createSubmission(SubmissionCreateRequestDTO request) {
        User worker = userRepository.findByIdWithLock(request.workerId())
                .orElseThrow(() -> new IllegalArgumentException("Воркер не найден: " + request.workerId()));

        if (!worker.isAccountNonLocked()) {
            throw new IllegalStateException("Аккаунт заблокирован.");
        }

        PlatformEntity platform = platformRepository.findById(request.platformId())
                .orElseThrow(() -> new IllegalArgumentException("Платформа не найдена: " + request.platformId()));

        if (!Boolean.TRUE.equals(platform.getIsEnabled())) {
            throw new IllegalStateException("Платформа отключена.");
        }

        Offer offer = offerRepository.findByIdWithLock(request.offerId())
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + request.offerId()));

        if (!Boolean.TRUE.equals(offer.getIsActive())) {
            throw new IllegalStateException("Оффер закрыт.");
        }

        Pattern pattern = Pattern.compile(platform.getUrlRegexPattern());
        Matcher matcher = pattern.matcher(request.sourceUrl());
        String externalVideoId;
        if (matcher.find()) {
            externalVideoId = matcher.group(1);
        } else {
            externalVideoId = "vid_" + System.currentTimeMillis();
        }

        if (submissionRepository.existsByPlatformAndExternalVideoId(platform, externalVideoId)) {
            throw new IllegalStateException("Это видео уже зарегистрировано в системе.");
        }

        VideoStatsPayload stats = statsRegistry.fetch(platform, request.sourceUrl(), externalVideoId);
        long actualViews = request.declaredViews() != null && request.declaredViews() > 0
                ? request.declaredViews() : stats.views();

        if (actualViews < offer.getMinViewsThreshold()) {
            throw new IllegalArgumentException(String.format("Просмотров (%d) меньше порога (%d)", actualViews, offer.getMinViewsThreshold()));
        }

        // Views Capping: a single video's payable views are clamped to the offer's
        // maxViewsCapPerVideo (when set) before the hold is computed — the raw, uncapped
        // actualViews is still what's recorded/shown as the video's real performance.
        long payableViews = offer.getMaxViewsCapPerVideo() != null
                ? Math.min(actualViews, offer.getMaxViewsCapPerVideo())
                : actualViews;

        BigDecimal holdAmount = BigDecimal.valueOf(payableViews)
                .multiply(offer.getWorkerCpmRate())
                .divide(BigDecimal.valueOf(1_000_000), 4, RoundingMode.HALF_UP);

        // If the (already-capped) hold still exceeds what's left of the offer's budget, clamp the
        // hold to the remaining budget rather than rejecting the submission outright — the worker
        // still gets a hold, just capped at whatever the advertiser has left to spend.
        if (offer.getRemainingBudget().compareTo(holdAmount) < 0) {
            holdAmount = offer.getRemainingBudget();
        }

        offer.setRemainingBudget(offer.getRemainingBudget().subtract(holdAmount));
        offerRepository.save(offer);

        worker.setHoldBalance(worker.getHoldBalance().add(holdAmount));
        userRepository.save(worker);

        Submission submission = Submission.builder()
                .worker(worker)
                .offer(offer)
                .platform(platform)
                .sourceUrl(request.sourceUrl().trim())
                .externalVideoId(externalVideoId)
                .authorChannelName(stats.author())
                .recordedViews(actualViews)
                .payableViews(payableViews)
                .recordedLikes(stats.likes())
                .recordedComments(stats.comments())
                .currentEngagementRate(stats.engagementRate())
                .analyticsProofAssetUrl(request.screenshotAssetUrl())
                .holdAmount(holdAmount)
                .status(Submission.Status.PENDING_REVIEW)
                .holdExpiresAt(Instant.now().plus(offer.getHoldPeriodDays(), ChronoUnit.DAYS))
                .lastSynchronizedAt(Instant.now())
                .build();

        Submission saved = submissionRepository.save(submission);

        telegramNotificationService.notifyNewSubmission(offer.getAdvertiser(), offer.getTitle(), worker.getUsername());
        telegramNotificationService.notifyNewSubmissionToReview(saved.getId(), offer.getTitle(),
                platform.getDisplayName(), saved.getSourceUrl());
        notifyIfBudgetLow(offer);

        return saved;
    }

    /** Fires the advertiser's low-budget Telegram push + email once remaining budget drops under {@link #LOW_BUDGET_THRESHOLD_PERCENT}. */
    private void notifyIfBudgetLow(Offer offer) {
        if (offer.getTotalBudget() == null || offer.getTotalBudget().signum() <= 0) {
            return;
        }
        BigDecimal remainingPercent = offer.getRemainingBudget()
                .multiply(BigDecimal.valueOf(100))
                .divide(offer.getTotalBudget(), 4, RoundingMode.HALF_UP);
        if (remainingPercent.compareTo(LOW_BUDGET_THRESHOLD_PERCENT) < 0) {
            telegramNotificationService.notifyLowBudget(offer.getAdvertiser(), offer.getTitle(), offer.getRemainingBudget());
            emailService.sendLowBudgetAlert(offer.getAdvertiser(), offer);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Submission getById(Long id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionResponseDTO getSubmissionDetails(Long id) {
        return SubmissionResponseDTO.fromEntity(getById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SubmissionResponseDTO> getWorkerSubmissions(Long workerId, Submission.Status status,
                                                                        Long campaignId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Submission> submissions = submissionRepository.findAllByWorkerId(workerId, status, campaignId, pageable);
        return PageResponseDTO.of(submissions.map(SubmissionResponseDTO::fromEntity));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubmissionResponseDTO> getOfferSubmissions(Long offerId, Long advertiserId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));

        if (!offer.getAdvertiser().getId().equals(advertiserId)) {
            throw new AccessDeniedException("Нет доступа к офферу.");
        }

        return submissionRepository.findAllByOfferIdOrderByCreatedAtDesc(offerId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SubmissionResponseDTO> getPendingReviewQueue(Submission.Status status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.ASC, "createdAt"));
        Page<Submission> submissions = status != null
                ? submissionRepository.findAllByStatus(status, pageable)
                : submissionRepository.findAllByStatusIn(
                        List.of(Submission.Status.PENDING_REVIEW, Submission.Status.DISPUTED), pageable);
        return PageResponseDTO.of(submissions.map(SubmissionResponseDTO::fromEntity));
    }

    @Override
    @Transactional
    public void disputeSubmission(Long submissionId, Long advertiserId, String reason, String comment) {
        Submission submission = submissionRepository.findByIdWithLock(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Сабмит не найден: " + submissionId));

        // 1. Проверка прав рекламодателя
        if (!submission.getOffer().getAdvertiser().getId().equals(advertiserId)) {
            throw new AccessDeniedException("Вы не являетесь владельцем этой кампании.");
        }

        // 2. Оспорить можно ТОЛЬКО ролик, уже прошедший первичную модерацию платформы и
        // находящийся в активном холде (TRACKING) — это и есть окно проверки рекламодателем до
        // автоматической разморозки HoldSettlementScheduler'ом. PENDING_REVIEW еще не прошел
        // модерацию платформы, APPROVED/PAID — выплата уже ушла, REJECTED/DISPUTED — терминальные
        // состояния для этого действия.
        switch (submission.getStatus()) {
            case TRACKING -> { /* holding window is open — dispute allowed */ }
            case PENDING_REVIEW -> throw new IllegalStateException(
                    "Ролик еще не прошел первичную модерацию платформы — дождитесь перевода в холд, чтобы оспорить его.");
            case APPROVED, PAID -> throw new IllegalStateException(
                    "Невозможно оспорить ролик: срок холда истек, выплата уже переведена на баланс воркера.");
            case REJECTED -> throw new IllegalStateException("Ролик уже был отклонен модерацией.");
            case DISPUTED -> throw new IllegalStateException("По этому ролику уже открыт активный спор.");
        }

        // 3. Перевод в статус спора — с этого момента HoldSettlementScheduler больше не видит эту
        // заявку (он выбирает только TRACKING), так что таймер авторазморозки эффективно
        // приостановлен до решения модератора.
        submission.setStatus(Submission.Status.DISPUTED);
        submission.setDisputeCategory(reason);
        submission.setDisputeComment(comment);
        submission.setDisputedAt(Instant.now());
        submissionRepository.save(submission);
        // No separate Dispute entity exists in this data model — a dispute is just a Submission
        // status, so the submission's own ID doubles as the "dispute ID" for notification purposes.
        telegramNotificationService.notifyNewDisputeRaised(submissionId, submissionId, submission.getOffer().getTitle(), reason);
        log.info("Submission #{} disputed by advertiser {}. Reason: {}", submissionId, advertiserId, reason);
    }

    @Override
    @Transactional
    public void rejectSubmission(Long submissionId, String rejectionReason) {
        Submission submission = submissionRepository.findByIdWithLock(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Сабмит не найден: " + submissionId));

        // Отклонить можно только то, что ещё не было выплачено (находится в холде или на рассмотрении)
        if (submission.getStatus() == Submission.Status.APPROVED || submission.getStatus() == Submission.Status.PAID) {
            throw new IllegalStateException("Нельзя отклонить уже выплаченный ролик.");
        }

        if (submission.getStatus() == Submission.Status.REJECTED) {
            return; // Идемпотентность
        }

        Submission.Status previousStatus = submission.getStatus();

        User worker = userRepository.findByIdWithLock(submission.getWorker().getId())
                .orElseThrow(() -> new IllegalArgumentException("Воркер не найден"));
        Offer offer = offerRepository.findByIdWithLock(submission.getOffer().getId())
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден"));

        // Возвращаем замороженные средства рекламодателю в бюджет оффера
        worker.setHoldBalance(worker.getHoldBalance().subtract(submission.getHoldAmount()));
        offer.setRemainingBudget(offer.getRemainingBudget().add(submission.getHoldAmount()));

        userRepository.save(worker);
        offerRepository.save(offer);

        submission.setStatus(Submission.Status.REJECTED);
        submission.setModerationComment(rejectionReason);
        submissionRepository.save(submission);

        telegramNotificationService.notifySubmissionRejected(worker, offer.getTitle(), rejectionReason);
        // A DISPUTED submission being rejected means the advertiser's dispute was upheld — resolved
        // in their favor (approved=false: the ролик stays rejected, no payout).
        if (previousStatus == Submission.Status.DISPUTED) {
            telegramNotificationService.notifyDisputeResolved(offer.getAdvertiser(), submissionId, false);
        }
        notifyIfWorkerShouldBeFlagged(worker);

        log.info("Submission #{} rejected. Hold ${} returned to offer budget.", submissionId, submission.getHoldAmount());
    }

    // A worker with a growing count of rejected submissions is worth a moderator/admin heads-up —
    // deliberately simple (no persisted "already flagged" marker, may re-fire on every further
    // rejection past the threshold), same accepted simplification as the advertiser low-budget alert.
    private static final long FLAG_AFTER_REJECTED_COUNT = 3;

    private void notifyIfWorkerShouldBeFlagged(User worker) {
        long rejectedCount = submissionRepository.countByWorkerIdAndStatus(worker.getId(), Submission.Status.REJECTED);
        if (rejectedCount >= FLAG_AFTER_REJECTED_COUNT) {
            telegramNotificationService.notifyWorkerFlagged(worker,
                    "Частые отклонения модерацией (" + rejectedCount + " отклоненных заявок)");
        }
    }

    /**
     * Multi-stage CPA-network approval, replacing the old "one approve = one payout" flow:
     * <ul>
     *     <li>{@code PENDING_REVIEW} (platform's first look): moves to {@code TRACKING} and opens
     *     the hold window. No money moves yet — it stays in the worker's {@code holdBalance}
     *     until {@link HoldSettlementScheduler} auto-settles it, or the advertiser disputes it
     *     first.</li>
     *     <li>{@code DISPUTED} (moderator resolves in the worker's favor): settles immediately,
     *     same as the scheduler would have, rather than making the worker wait out a hold that's
     *     already been contested and resolved.</li>
     *     <li>{@code TRACKING} (moderator manually fast-tracks a submission still inside its hold
     *     window): same immediate-settlement path as a resolved dispute — an explicit override of
     *     the scheduler for cases like an advertiser asking to expedite a payout.</li>
     * </ul>
     */
    @Override
    @Transactional
    public void approveSubmission(Long submissionId, String moderationComment) {
        Submission submission = submissionRepository.findByIdWithLock(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Сабмит не найден: " + submissionId));

        if (submission.getStatus() == Submission.Status.PENDING_REVIEW) {
            submission.setStatus(Submission.Status.TRACKING);
            submission.setHoldExpiresAt(Instant.now().plus(submission.getOffer().getHoldPeriodDays(), ChronoUnit.DAYS));
            submission.setModerationComment("Одобрено первичной модерацией. Переведено в холд");
            submissionRepository.save(submission);
            telegramNotificationService.notifySubmissionApproved(
                    submission.getWorker(), submission.getOffer().getTitle(), submission.getHoldAmount());
            log.info("Submission #{} passed platform review -> TRACKING, hold expires at {}",
                    submissionId, submission.getHoldExpiresAt());
            return;
        }

        if (submission.getStatus() == Submission.Status.DISPUTED || submission.getStatus() == Submission.Status.TRACKING) {
            Submission.Status previousStatus = submission.getStatus();
            submission.setStatus(Submission.Status.APPROVED);
            submission.setModerationComment(moderationComment);
            // Финансовый расчет и перевод средств с холда на свободный баланс воркера
            settlementEngine.executeSettlement(submission);
            submissionRepository.save(submission);
            // A DISPUTED submission being approved means the dispute was resolved in the worker's
            // favor (approved=true) — the advertiser gets a heads-up either way.
            if (previousStatus == Submission.Status.DISPUTED) {
                telegramNotificationService.notifyDisputeResolved(
                        submission.getOffer().getAdvertiser(), submissionId, true);
            }
            log.info("Submission #{} approved ({} -> APPROVED). Payout settled to worker.",
                    submissionId, previousStatus);
            return;
        }

        throw new IllegalStateException("Недопустимый статус для одобрения: " + submission.getStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<SubmissionResponseDTO> getAdvertiserTraffic(Long advertiserId, Submission.Status statusFilter,
                                                                        int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Submission> submissions = submissionRepository.findAllByOfferAdvertiserId(advertiserId, statusFilter, pageable);
        return PageResponseDTO.of(submissions.map(SubmissionResponseDTO::fromEntity));
    }
}