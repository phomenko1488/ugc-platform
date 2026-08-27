package com.platform.ugc.service.submission.impl;

import com.platform.ugc.adapter.stats.DynamicStatsProviderRegistry;
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
import com.platform.ugc.service.finance.FinancialSettlementEngine;
import com.platform.ugc.service.submission.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

        BigDecimal holdAmount = BigDecimal.valueOf(actualViews)
                .multiply(offer.getWorkerCpmRate())
                .divide(BigDecimal.valueOf(1_000_000), 4, RoundingMode.HALF_UP);

        if (offer.getRemainingBudget().compareTo(holdAmount) < 0) {
            throw new IllegalStateException("Бюджет оффера исчерпан.");
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
                .recordedLikes(stats.likes())
                .recordedComments(stats.comments())
                .currentEngagementRate(stats.engagementRate())
                .analyticsProofAssetUrl(request.screenshotAssetUrl())
                .holdAmount(holdAmount)
                .status(Submission.Status.PENDING_REVIEW)
                .holdExpiresAt(Instant.now().plus(offer.getHoldPeriodDays(), ChronoUnit.DAYS))
                .lastSynchronizedAt(Instant.now())
                .build();

        return submissionRepository.save(submission);
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
    public List<SubmissionResponseDTO> getWorkerSubmissions(Long workerId) {
        return submissionRepository.findAllByWorkerIdOrderByCreatedAtDesc(workerId).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
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
    public List<SubmissionResponseDTO> getPendingReviewQueue() {
        return submissionRepository.findAllByStatusOrderByCreatedAtAsc(Submission.Status.PENDING_REVIEW).stream()
                .map(SubmissionResponseDTO::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void approveSubmission(Long submissionId, String moderationComment) {
        Submission submission = submissionRepository.findByIdWithLock(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена: " + submissionId));

        if (submission.getStatus() != Submission.Status.PENDING_REVIEW &&
                submission.getStatus() != Submission.Status.TRACKING) {
            throw new IllegalStateException("Некорректный статус для одобрения: " + submission.getStatus());
        }

        submission.setStatus(Submission.Status.APPROVED);
        submission.setModerationComment(moderationComment);

        settlementEngine.executeSettlement(submission);
        submissionRepository.save(submission);
    }

    @Override
    @Transactional
    public void rejectSubmission(Long submissionId, String rejectionReason) {
        Submission submission = submissionRepository.findByIdWithLock(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена: " + submissionId));

        if (submission.getStatus() == Submission.Status.APPROVED || submission.getStatus() == Submission.Status.PAID) {
            throw new IllegalStateException("Нельзя отклонить уже одобренную заявку.");
        }

        User worker = userRepository.findByIdWithLock(submission.getWorker().getId())
                .orElseThrow(() -> new IllegalArgumentException("Воркер не найден"));

        Offer offer = offerRepository.findByIdWithLock(submission.getOffer().getId())
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден"));

        worker.setHoldBalance(worker.getHoldBalance().subtract(submission.getHoldAmount()));
        offer.setRemainingBudget(offer.getRemainingBudget().add(submission.getHoldAmount()));

        userRepository.save(worker);
        offerRepository.save(offer);

        submission.setStatus(Submission.Status.REJECTED);
        submission.setModerationComment(rejectionReason);
        submissionRepository.save(submission);
    }
}