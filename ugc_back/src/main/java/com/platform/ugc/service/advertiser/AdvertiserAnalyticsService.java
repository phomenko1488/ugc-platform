package com.platform.ugc.service.advertiser;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.advertiser.AdvertiserDashboardDTO;
import com.platform.ugc.dto.advertiser.AdvertiserDeepAnalyticsDTO;
import com.platform.ugc.dto.advertiser.CampaignPerformanceDTO;
import com.platform.ugc.dto.advertiser.DailyAnalyticsPointDTO;
import com.platform.ugc.dto.advertiser.DailyViewsDTO;
import com.platform.ugc.dto.advertiser.GeoShareDTO;
import com.platform.ugc.dto.advertiser.PlatformShareDTO;
import com.platform.ugc.dto.advertiser.TopCreatorDTO;
import com.platform.ugc.dto.submission.SubmissionResponseDTO;
import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Backs {@code AdvertiserDashboardPage} (the KPI cards, 30-day reach chart and top-5 videos an
 * advertiser sees on login) and {@code AdvertiserAnalyticsPage} — the deeper, date-filterable
 * Analytics Hub. Reads only; every figure here is derived from existing Offer/Submission rows
 * rather than a separately maintained summary table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdvertiserAnalyticsService {

    private static final int TIMELINE_DAYS = 30;
    private static final int TOP_SUBMISSIONS_LIMIT = 5;
    private static final int DEFAULT_ANALYTICS_WINDOW_DAYS = 30;
    private static final int TOP_CREATORS_LIMIT = 10;

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

        // NOTE: this must stay findAllByOffer_AdvertiserIdOrderByCreatedAtDesc(advertiserId) —
        // findAllByOfferIdOrderByCreatedAtDesc takes an *offer* id, not an advertiser id, and
        // silently returns wrong/empty data when passed one.
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

    /**
     * Backs the Advertiser Analytics Hub — {@code GET /api/v1/advertiser/{advertiserId}/analytics}.
     * Defaults to a trailing 30-day window (today inclusive) when {@code from}/{@code to} are
     * omitted, and silently swaps them if the caller passes an inverted range.
     * <p>
     * Two submission sets drive every metric here:
     * <ul>
     *     <li>{@code deliveredSubmissions} (status {@code APPROVED}/{@code PAID}) — the only rows
     *     with confirmed, billable views. Spend, views, eCPM, platform/geo shares and creator
     *     earnings all come from this set, matching {@link com.platform.ugc.service.finance.FinancialSettlementEngine}'s
     *     gross-cost/worker-payout formulas.</li>
     *     <li>{@code periodSubmissions} (any status) — engagement rate, interaction counts and raw
     *     submission volume reflect creator activity regardless of moderation outcome.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public AdvertiserDeepAnalyticsDTO getDeepAnalytics(Long advertiserId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);
        LocalDate rangeFrom = range.from();
        LocalDate rangeTo = range.to();

        // NOTE: see getDashboard() above — this must stay the Offer_AdvertiserId variant.
        List<Submission> allSubmissions = submissionRepository.findAllByOffer_AdvertiserIdOrderByCreatedAtDesc(advertiserId);
        List<Submission> periodSubmissions = allSubmissions.stream()
                .filter(s -> withinRange(s.getCreatedAt(), rangeFrom, rangeTo))
                .toList();
        List<Submission> deliveredSubmissions = periodSubmissions.stream()
                .filter(s -> s.getStatus() == Submission.Status.APPROVED || s.getStatus() == Submission.Status.PAID)
                .toList();

        BigDecimal totalGrossSpent = deliveredSubmissions.stream()
                .map(this::grossCostOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalDeliveredViews = deliveredSubmissions.stream()
                .mapToLong(s -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L)
                .sum();

        BigDecimal deliveredViewsInMillions = viewsInMillions(totalDeliveredViews);
        BigDecimal effectiveCpm = deliveredViewsInMillions.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalGrossSpent.divide(deliveredViewsInMillions, 4, RoundingMode.HALF_UP);

        List<BigDecimal> engagementRates = periodSubmissions.stream()
                .map(Submission::getCurrentEngagementRate)
                .filter(Objects::nonNull)
                .toList();
        BigDecimal averageEngagementRate = engagementRates.isEmpty()
                ? BigDecimal.ZERO
                : engagementRates.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(engagementRates.size()), 2, RoundingMode.HALF_UP);

        long totalInteractions = periodSubmissions.stream()
                .mapToLong(s -> (s.getRecordedLikes() != null ? s.getRecordedLikes() : 0L)
                        + (s.getRecordedComments() != null ? s.getRecordedComments() : 0L))
                .sum();

        List<PlatformShareDTO> platformBreakdown = buildPlatformBreakdown(deliveredSubmissions, totalDeliveredViews);
        List<GeoShareDTO> geoBreakdown = buildGeoBreakdown(deliveredSubmissions, totalDeliveredViews);
        List<TopCreatorDTO> topCreators = buildTopCreators(deliveredSubmissions);
        List<DailyAnalyticsPointDTO> dailyTrends = buildDailyTrends(periodSubmissions, deliveredSubmissions, rangeFrom, rangeTo);

        return new AdvertiserDeepAnalyticsDTO(
                rangeFrom,
                rangeTo,
                totalGrossSpent,
                totalDeliveredViews,
                effectiveCpm,
                averageEngagementRate,
                totalInteractions,
                platformBreakdown,
                geoBreakdown,
                topCreators,
                dailyTrends
        );
    }

    /**
     * Backs the standalone, paginated campaign-comparison endpoint — {@code GET
     * /api/v1/advertiser/{advertiserId}/analytics/campaigns} — split out of the monolithic
     * {@link #getDeepAnalytics} payload (pagination initiative) so a large advertiser's campaign
     * table doesn't have to ride along with every other analytics fetch.
     * <p>
     * The comparison itself is still built in Java per {@link #buildCampaignComparison} (it groups
     * submissions by offer and computes spend/views/dispute-rate per row) rather than a single SQL
     * aggregate — {@link PageResponseDTO#ofList} slices the computed result, so only the response
     * payload is paginated, not the underlying query.
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<CampaignPerformanceDTO> getCampaignComparison(Long advertiserId, LocalDate from, LocalDate to,
                                                                          int page, int size) {
        DateRange range = resolveRange(from, to);
        List<Offer> offers = offerRepository.findAllByAdvertiserId(advertiserId);
        List<Submission> allSubmissions = submissionRepository.findAllByOffer_AdvertiserIdOrderByCreatedAtDesc(advertiserId);
        List<Submission> periodSubmissions = allSubmissions.stream()
                .filter(s -> withinRange(s.getCreatedAt(), range.from(), range.to()))
                .toList();
        List<Submission> deliveredSubmissions = periodSubmissions.stream()
                .filter(s -> s.getStatus() == Submission.Status.APPROVED || s.getStatus() == Submission.Status.PAID)
                .toList();

        List<CampaignPerformanceDTO> comparison = buildCampaignComparison(offers, periodSubmissions, deliveredSubmissions);
        return PageResponseDTO.ofList(comparison, page, size);
    }

    /** Defaults to a trailing 30-day window (today inclusive) and swaps an inverted range. */
    private DateRange resolveRange(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate rangeTo = to != null ? to : today;
        LocalDate rangeFrom = from != null ? from : rangeTo.minusDays(DEFAULT_ANALYTICS_WINDOW_DAYS - 1L);
        if (rangeFrom.isAfter(rangeTo)) {
            LocalDate swap = rangeFrom;
            rangeFrom = rangeTo;
            rangeTo = swap;
        }
        return new DateRange(rangeFrom, rangeTo);
    }

    private record DateRange(LocalDate from, LocalDate to) {
    }

    private List<PlatformShareDTO> buildPlatformBreakdown(List<Submission> delivered, long totalViews) {
        Map<String, PlatformAgg> byPlatform = new LinkedHashMap<>();
        for (Submission submission : delivered) {
            PlatformEntity platform = submission.getPlatform();
            String code = platform != null ? platform.getCode() : "UNKNOWN";
            String name = platform != null ? platform.getDisplayName() : "Неизвестная платформа";
            PlatformAgg agg = byPlatform.computeIfAbsent(code, k -> new PlatformAgg(name));
            agg.views += submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L;
            agg.spend = agg.spend.add(grossCostOf(submission));
        }

        List<PlatformShareDTO> result = new ArrayList<>();
        for (Map.Entry<String, PlatformAgg> entry : byPlatform.entrySet()) {
            PlatformAgg agg = entry.getValue();
            BigDecimal share = shareOf(agg.views, totalViews);
            result.add(new PlatformShareDTO(entry.getKey(), agg.name, agg.views, agg.spend, share));
        }
        result.sort(Comparator.comparingLong(PlatformShareDTO::views).reversed());
        return result;
    }

    /**
     * See {@link GeoShareDTO}'s javadoc: a submission has no per-video GEO of its own, so its
     * views are split evenly across its offer's {@code targetGeos}. Integer division drops a
     * remainder of at most {@code geos.size() - 1} views per submission — immaterial at any real
     * traffic volume, and never worth pulling in a rounding library for.
     */
    private List<GeoShareDTO> buildGeoBreakdown(List<Submission> delivered, long totalViews) {
        Map<String, GeoAgg> byGeo = new LinkedHashMap<>();
        for (Submission submission : delivered) {
            Offer offer = submission.getOffer();
            Set<GeoCountry> geos = offer != null ? offer.getTargetGeos() : null;
            if (geos == null || geos.isEmpty()) {
                continue;
            }
            long views = submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L;
            long sharePerGeo = views / geos.size();
            for (GeoCountry geo : geos) {
                GeoAgg agg = byGeo.computeIfAbsent(geo.getIsoCode(), k -> new GeoAgg(geo.getName()));
                agg.views += sharePerGeo;
            }
        }

        List<GeoShareDTO> result = new ArrayList<>();
        for (Map.Entry<String, GeoAgg> entry : byGeo.entrySet()) {
            GeoAgg agg = entry.getValue();
            result.add(new GeoShareDTO(entry.getKey(), agg.name, agg.views, shareOf(agg.views, totalViews)));
        }
        result.sort(Comparator.comparingLong(GeoShareDTO::views).reversed());
        return result;
    }

    private List<TopCreatorDTO> buildTopCreators(List<Submission> delivered) {
        Map<Long, CreatorAgg> byWorker = new LinkedHashMap<>();
        for (Submission submission : delivered) {
            User worker = submission.getWorker();
            if (worker == null) {
                continue;
            }
            CreatorAgg agg = byWorker.computeIfAbsent(worker.getId(),
                    k -> new CreatorAgg(worker.getUsername(), worker.getAffiliateTag()));
            agg.views += submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L;
            agg.earnings = agg.earnings.add(workerPayoutOf(submission));
            agg.approvedCount++;
        }

        List<TopCreatorDTO> result = new ArrayList<>();
        for (Map.Entry<Long, CreatorAgg> entry : byWorker.entrySet()) {
            CreatorAgg agg = entry.getValue();
            result.add(new TopCreatorDTO(entry.getKey(), agg.username, agg.affiliateTag, agg.views, agg.earnings, agg.approvedCount));
        }
        result.sort(Comparator.comparingLong(TopCreatorDTO::viewsDelivered).reversed());
        return result.size() > TOP_CREATORS_LIMIT ? result.subList(0, TOP_CREATORS_LIMIT) : result;
    }

    /**
     * Covers every offer the advertiser has ever created, not just ones with activity in the
     * selected window, so a paused/empty campaign still shows up as a zero row rather than
     * silently disappearing from the comparison matrix.
     * <p>
     * {@code disputeRatePercentage} uses {@code disputedAt != null} rather than the current
     * {@code DISPUTED} status, since {@code disputedAt} stays populated as an audit trail after a
     * dispute is resolved (see {@link Submission#getDisputedAt()}) — a resolved-but-once-disputed
     * video should still count toward the rate.
     */
    private List<CampaignPerformanceDTO> buildCampaignComparison(List<Offer> offers,
                                                                   List<Submission> periodSubmissions,
                                                                   List<Submission> deliveredSubmissions) {
        Map<Long, List<Submission>> periodByOffer = periodSubmissions.stream()
                .collect(Collectors.groupingBy(s -> s.getOffer().getId()));
        Map<Long, List<Submission>> deliveredByOffer = deliveredSubmissions.stream()
                .collect(Collectors.groupingBy(s -> s.getOffer().getId()));

        List<CampaignPerformanceDTO> result = new ArrayList<>();
        for (Offer offer : offers) {
            List<Submission> offerPeriodSubs = periodByOffer.getOrDefault(offer.getId(), List.of());
            List<Submission> offerDeliveredSubs = deliveredByOffer.getOrDefault(offer.getId(), List.of());

            BigDecimal spend = offerDeliveredSubs.stream().map(this::grossCostOf).reduce(BigDecimal.ZERO, BigDecimal::add);
            long views = offerDeliveredSubs.stream()
                    .mapToLong(s -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L)
                    .sum();
            long submissionsCount = offerPeriodSubs.size();
            long disputedCount = offerPeriodSubs.stream().filter(s -> s.getDisputedAt() != null).count();
            BigDecimal disputeRate = submissionsCount == 0 ? BigDecimal.ZERO : shareOf(disputedCount, submissionsCount);

            result.add(new CampaignPerformanceDTO(offer.getId(), offer.getTitle(), spend, views, submissionsCount, disputeRate));
        }
        result.sort(Comparator.comparing(CampaignPerformanceDTO::spend).reversed());
        return result;
    }

    private List<DailyAnalyticsPointDTO> buildDailyTrends(List<Submission> periodSubmissions,
                                                            List<Submission> deliveredSubmissions,
                                                            LocalDate rangeFrom,
                                                            LocalDate rangeTo) {
        Map<LocalDate, Long> viewsByDay = new HashMap<>();
        Map<LocalDate, BigDecimal> spendByDay = new HashMap<>();
        for (Submission submission : deliveredSubmissions) {
            LocalDate day = dayOf(submission.getCreatedAt());
            if (day == null) {
                continue;
            }
            viewsByDay.merge(day, submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L, Long::sum);
            spendByDay.merge(day, grossCostOf(submission), BigDecimal::add);
        }

        Map<LocalDate, Long> countByDay = new HashMap<>();
        for (Submission submission : periodSubmissions) {
            LocalDate day = dayOf(submission.getCreatedAt());
            if (day == null) {
                continue;
            }
            countByDay.merge(day, 1L, Long::sum);
        }

        List<DailyAnalyticsPointDTO> result = new ArrayList<>();
        for (LocalDate day = rangeFrom; !day.isAfter(rangeTo); day = day.plusDays(1)) {
            result.add(new DailyAnalyticsPointDTO(
                    day,
                    viewsByDay.getOrDefault(day, 0L),
                    spendByDay.getOrDefault(day, BigDecimal.ZERO),
                    countByDay.getOrDefault(day, 0L)
            ));
        }
        return result;
    }

    /** {@code recordedViews / 1_000_000}, scale 6 HALF_UP — matches FinancialSettlementEngine's convention. */
    private BigDecimal viewsInMillions(Long recordedViews) {
        long views = recordedViews != null ? recordedViews : 0L;
        return BigDecimal.valueOf(views).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
    }

    private BigDecimal viewsInMillions(long recordedViews) {
        return viewsInMillions(Long.valueOf(recordedViews));
    }

    /** {@code viewsInMillions * offer.advertiserCpmRate} — same formula FinancialSettlementEngine bills the advertiser with. */
    private BigDecimal grossCostOf(Submission submission) {
        return viewsInMillions(settlementViewsOf(submission)).multiply(submission.getOffer().getAdvertiserCpmRate());
    }

    /** {@code viewsInMillions * offer.workerCpmRate} — same formula FinancialSettlementEngine pays the worker with. */
    private BigDecimal workerPayoutOf(Submission submission) {
        return viewsInMillions(settlementViewsOf(submission)).multiply(submission.getOffer().getWorkerCpmRate());
    }

    /**
     * Views Capping: mirrors {@code FinancialSettlementEngine.executeSettlement}'s own resolution —
     * {@code payableViews} (recordedViews clamped to the offer's maxViewsCapPerVideo at submission
     * time) when present, else the uncapped {@code recordedViews} for rows created before this
     * feature existed. Keeps every money figure in this service consistent with what was actually
     * settled to the ledger.
     */
    private long settlementViewsOf(Submission submission) {
        return submission.getPayableViews() != null ? submission.getPayableViews()
                : (submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L);
    }

    private boolean withinRange(Instant createdAt, LocalDate from, LocalDate to) {
        LocalDate day = dayOf(createdAt);
        return day != null && !day.isBefore(from) && !day.isAfter(to);
    }

    private LocalDate dayOf(Instant createdAt) {
        return createdAt == null ? null : createdAt.atZone(ZoneOffset.UTC).toLocalDate();
    }

    private BigDecimal shareOf(long part, long whole) {
        if (whole == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(part).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(whole), 2, RoundingMode.HALF_UP);
    }

    /** Mutable per-platform accumulator; not exposed outside {@link #buildPlatformBreakdown}. */
    private static final class PlatformAgg {
        private final String name;
        private long views;
        private BigDecimal spend = BigDecimal.ZERO;

        private PlatformAgg(String name) {
            this.name = name;
        }
    }

    /** Mutable per-GEO accumulator; not exposed outside {@link #buildGeoBreakdown}. */
    private static final class GeoAgg {
        private final String name;
        private long views;

        private GeoAgg(String name) {
            this.name = name;
        }
    }

    /** Mutable per-creator accumulator; not exposed outside {@link #buildTopCreators}. */
    private static final class CreatorAgg {
        private final String username;
        private final String affiliateTag;
        private long views;
        private BigDecimal earnings = BigDecimal.ZERO;
        private long approvedCount;

        private CreatorAgg(String username, String affiliateTag) {
            this.username = username;
            this.affiliateTag = affiliateTag;
        }
    }
}
