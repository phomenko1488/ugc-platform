package com.platform.ugc.service.advertiser;

import com.platform.ugc.dto.advertiser.AdvertiserDashboardDTO;
import com.platform.ugc.dto.advertiser.DailyViewsDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Backs {@code AdvertiserDashboardPage} — the KPI cards, 30-day reach chart and top-5 videos an
 * advertiser sees on login. Reads only; every figure here is derived from existing Offer/Submission
 * rows rather than a separately maintained summary table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdvertiserAnalyticsService {

    private static final int TIMELINE_DAYS = 30;
    private static final int TOP_SUBMISSIONS_LIMIT = 5;

    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final SubmissionRepository submissionRepository;

    @Transactional(readOnly = true)
    public AdvertiserDashboardDTO getDashboard(Long advertiserId) {
        User advertiser = userRepository.findById(advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));

        List<Offer> offers = offerRepository.findAllByAdvertiserId(advertiserId);
        List<Offer> activeOffers = offers.stream().filter(o -> Boolean.TRUE.equals(o.getIsActive())).toList();

        BigDecimal activeOffersBudgetTotal = activeOffers.stream()
                .map(Offer::getRemainingBudget)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSpent = offers.stream()
                .map(o -> o.getTotalBudget().subtract(o.getRemainingBudget()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal averageCpmRate = offers.isEmpty()
                ? BigDecimal.ZERO
                : offers.stream().map(Offer::getAdvertiserCpmRate).reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(offers.size()), 4, RoundingMode.HALF_UP);

        List<Submission> submissions = submissionRepository.findAllByOffer_AdvertiserIdOrderByCreatedAtDesc(advertiserId);

        long totalRecordedViews = submissions.stream()
                .mapToLong(s -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L)
                .sum();

        List<BigDecimal> engagementRates = submissions.stream()
                .map(Submission::getCurrentEngagementRate)
                .filter(rate -> rate != null)
                .toList();
        BigDecimal averageEngagementRate = engagementRates.isEmpty()
                ? BigDecimal.ZERO
                : engagementRates.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(engagementRates.size()), 2, RoundingMode.HALF_UP);

        List<DailyViewsDTO> viewsTimeline = buildViewsTimeline(submissions);

        List<SubmissionResponseDTO> topSubmissions = submissions.stream()
                .sorted(Comparator.comparing((Submission s) -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L).reversed())
                .limit(TOP_SUBMISSIONS_LIMIT)
                .map(SubmissionResponseDTO::fromEntity)
                .toList();

        return new AdvertiserDashboardDTO(
                advertiser.getAvailableBalance(),
                activeOffersBudgetTotal,
                totalSpent,
                totalRecordedViews,
                activeOffers.size(),
                averageCpmRate,
                averageEngagementRate,
                viewsTimeline,
                topSubmissions
        );
    }

    private List<DailyViewsDTO> buildViewsTimeline(List<Submission> submissions) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate windowStart = today.minusDays(TIMELINE_DAYS - 1L);

        Map<LocalDate, Long> viewsByDay = new HashMap<>();
        for (Submission submission : submissions) {
            Instant createdAt = submission.getCreatedAt();
            if (createdAt == null) {
                continue;
            }
            LocalDate day = createdAt.atZone(ZoneOffset.UTC).toLocalDate();
            if (day.isBefore(windowStart) || day.isAfter(today)) {
                continue;
            }
            long views = submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L;
            viewsByDay.merge(day, views, Long::sum);
        }

        List<DailyViewsDTO> timeline = new ArrayList<>(TIMELINE_DAYS);
        for (LocalDate day = windowStart; !day.isAfter(today); day = day.plusDays(1)) {
            timeline.add(new DailyViewsDTO(day, viewsByDay.getOrDefault(day, 0L)));
        }
        return timeline;
    }
}
