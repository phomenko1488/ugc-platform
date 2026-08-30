package com.platform.ugc.service.partner.impl;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.partner.DailyPartnerEarningsDTO;
import com.platform.ugc.dto.partner.PartnerAdvertiserSummaryDTO;
import com.platform.ugc.dto.partner.PartnerDashboardDTO;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.partner.PartnerAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backs the B2B Partner Cabinet ({@code /modules/partner}) — dashboard KPIs, the referred-brands
 * CRM, and the partner's contract terms. Every figure here is derived from the same
 * Offer/Submission/FinancialLedgerEntry rows {@link com.platform.ugc.service.finance.FinancialSettlementEngine}
 * already writes when a submission settles; there's no separate partner-earnings ledger to keep
 * in sync.
 * <p>
 * "Delivered" (confirmed, billable) submissions are {@code APPROVED}/{@code PAID} — same
 * convention {@code AdvertiserAnalyticsService} uses — and a partner's actual earnings always come
 * from their own {@code B2B_PARTNER_COMMISSION} ledger rows rather than being recomputed from
 * scratch, since {@link com.platform.ugc.service.finance.FinancialSettlementEngine} already
 * applies the partner's contract terms (which can change over time) at settlement time.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerAnalyticsServiceImpl implements PartnerAnalyticsService {

    private static final int EARNINGS_TIMELINE_DAYS = 30;

    // Falls back to this when a partner's B2BPartnerTerms row somehow comes back null (it
    // shouldn't — the embeddable's own @Builder.Default already seeds 20% PERCENT_OF_PLATFORM_MARGIN
    // on every newly built User — but the ТЗ asks for an explicit safety net here too).
    private static final B2BPartnerTerms DEFAULT_TERMS = B2BPartnerTerms.builder()
            .commissionType(B2BPartnerTerms.CommissionType.PERCENT_OF_PLATFORM_MARGIN)
            .commissionRate(new BigDecimal("20.00"))
            .isActive(true)
            .build();

    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final SubmissionRepository submissionRepository;
    private final FinancialLedgerRepository financialLedgerRepository;

    @Override
    @Transactional(readOnly = true)
    public PartnerDashboardDTO getPartnerDashboard(Long partnerId) {
        User partner = requirePartner(partnerId);

        List<User> advertisers = userRepository.findAllByB2bPartnerId(partnerId);
        List<Long> advertiserIds = advertisers.stream().map(User::getId).toList();

        List<Offer> offers = advertiserIds.isEmpty() ? List.of() : offerRepository.findAllByAdvertiserIdIn(advertiserIds);
        long activeOffersCount = offers.stream().filter(o -> Boolean.TRUE.equals(o.getIsActive())).count();

        List<Submission> delivered = advertiserIds.isEmpty() ? List.of() : loadDeliveredSubmissions(advertiserIds);
        long totalDeliveredViews = delivered.stream()
                .mapToLong(s -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L)
                .sum();
        BigDecimal totalGrossTurnover = delivered.stream()
                .map(this::grossCostOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<FinancialLedgerEntry> commissionEntries = financialLedgerRepository.findAllByUserIdAndEntryType(
                partnerId, FinancialLedgerEntry.EntryType.B2B_PARTNER_COMMISSION);
        BigDecimal totalEarned = commissionEntries.stream()
                .map(FinancialLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PartnerDashboardDTO(
                partner.getAvailableBalance(),
                totalEarned,
                advertisers.size(),
                activeOffersCount,
                totalDeliveredViews,
                totalGrossTurnover,
                resolveTerms(partner),
                buildEarningsTimeline(commissionEntries)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PartnerAdvertiserSummaryDTO> getReferredAdvertisers(Long partnerId, String search, int page, int size) {
        requirePartner(partnerId);

        List<User> advertisers = userRepository.findAllByB2bPartnerId(partnerId);
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            advertisers = advertisers.stream()
                    .filter(a -> containsIgnoreCase(a.getUsername(), q) || containsIgnoreCase(a.getEmail(), q))
                    .toList();
        }
        if (advertisers.isEmpty()) {
            return PageResponseDTO.ofList(List.of(), page, size);
        }
        List<Long> advertiserIds = advertisers.stream().map(User::getId).toList();

        Map<Long, List<Offer>> offersByAdvertiser = offerRepository.findAllByAdvertiserIdIn(advertiserIds).stream()
                .collect(Collectors.groupingBy(o -> o.getAdvertiser().getId()));

        Map<Long, List<Submission>> deliveredByAdvertiser = loadDeliveredSubmissions(advertiserIds).stream()
                .collect(Collectors.groupingBy(s -> s.getOffer().getAdvertiser().getId()));

        List<FinancialLedgerEntry> commissionEntries = financialLedgerRepository.findAllByUserIdAndEntryType(
                partnerId, FinancialLedgerEntry.EntryType.B2B_PARTNER_COMMISSION);
        Map<Long, BigDecimal> earnedByAdvertiser = groupEarningsByAdvertiser(commissionEntries);

        List<PartnerAdvertiserSummaryDTO> result = new ArrayList<>();
        for (User advertiser : advertisers) {
            List<Offer> advertiserOffers = offersByAdvertiser.getOrDefault(advertiser.getId(), List.of());
            List<Submission> advertiserDelivered = deliveredByAdvertiser.getOrDefault(advertiser.getId(), List.of());

            long activeOffersCount = advertiserOffers.stream().filter(o -> Boolean.TRUE.equals(o.getIsActive())).count();
            long totalDeliveredViews = advertiserDelivered.stream()
                    .mapToLong(s -> s.getRecordedViews() != null ? s.getRecordedViews() : 0L)
                    .sum();
            BigDecimal totalSpent = advertiserDelivered.stream()
                    .map(this::grossCostOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal partnerEarned = earnedByAdvertiser.getOrDefault(advertiser.getId(), BigDecimal.ZERO);

            result.add(new PartnerAdvertiserSummaryDTO(
                    advertiser.getId(),
                    advertiser.getUsername(),
                    advertiser.getEmail(),
                    advertiser.getAffiliateTag(),
                    advertiser.getCreatedAt(),
                    activeOffersCount,
                    totalDeliveredViews,
                    totalSpent,
                    partnerEarned
            ));
        }

        result.sort((a, b) -> b.partnerEarnedFromThisAdvertiser().compareTo(a.partnerEarnedFromThisAdvertiser()));
        return PageResponseDTO.ofList(result, page, size);
    }

    private boolean containsIgnoreCase(String haystack, String needleLower) {
        return haystack != null && haystack.toLowerCase().contains(needleLower);
    }

    @Override
    @Transactional(readOnly = true)
    public B2BPartnerTerms getPartnerTerms(Long partnerId) {
        return resolveTerms(requirePartner(partnerId));
    }

    private User requirePartner(Long partnerId) {
        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new IllegalArgumentException("Партнер не найден: " + partnerId));
        if (!partner.getRoles().contains(Role.ROLE_PARTNER)) {
            throw new AccessDeniedException("Пользователь [ID: " + partnerId + "] не является B2B-партнером.");
        }
        return partner;
    }

    private B2BPartnerTerms resolveTerms(User partner) {
        return partner.getB2bPartnerTerms() != null ? partner.getB2bPartnerTerms() : DEFAULT_TERMS;
    }

    private List<Submission> loadDeliveredSubmissions(Collection<Long> advertiserIds) {
        return submissionRepository.findAllByOffer_AdvertiserIdIn(advertiserIds).stream()
                .filter(s -> s.getStatus() == Submission.Status.APPROVED || s.getStatus() == Submission.Status.PAID)
                .toList();
    }

    /** {@code viewsInMillions * offer.advertiserCpmRate} — the advertiser's gross ad spend for one submission. */
    private BigDecimal grossCostOf(Submission submission) {
        // Views Capping: settle on payableViews (mirrors FinancialSettlementEngine) so the CRM's
        // turnover figure matches what the advertiser was actually charged, not the raw video views.
        long views = submission.getPayableViews() != null ? submission.getPayableViews()
                : (submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L);
        BigDecimal viewsInMillions = BigDecimal.valueOf(views).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
        return viewsInMillions.multiply(submission.getOffer().getAdvertiserCpmRate());
    }

    /**
     * Resolves each ledger entry back to the advertiser it was earned from — via the entry's own
     * {@code offer} link, falling back to its {@code submission}'s offer for older rows recorded
     * before {@code offer} was set directly (same fallback {@code FinancialLedgerQueryService}
     * already uses) — and sums commission amounts per advertiser.
     */
    private Map<Long, BigDecimal> groupEarningsByAdvertiser(List<FinancialLedgerEntry> commissionEntries) {
        Map<Long, BigDecimal> earnedByAdvertiser = new HashMap<>();
        for (FinancialLedgerEntry entry : commissionEntries) {
            Offer offer = entry.getOffer() != null
                    ? entry.getOffer()
                    : (entry.getSubmission() != null ? entry.getSubmission().getOffer() : null);
            if (offer == null || offer.getAdvertiser() == null) {
                continue;
            }
            earnedByAdvertiser.merge(offer.getAdvertiser().getId(), entry.getAmount(), BigDecimal::add);
        }
        return earnedByAdvertiser;
    }

    private List<DailyPartnerEarningsDTO> buildEarningsTimeline(List<FinancialLedgerEntry> commissionEntries) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate windowStart = today.minusDays(EARNINGS_TIMELINE_DAYS - 1L);

        Map<LocalDate, BigDecimal> earningsByDay = new HashMap<>();
        Map<LocalDate, Long> viewsByDay = new HashMap<>();
        for (FinancialLedgerEntry entry : commissionEntries) {
            Instant createdAt = entry.getCreatedAt();
            if (createdAt == null) {
                continue;
            }
            LocalDate day = createdAt.atZone(ZoneOffset.UTC).toLocalDate();
            if (day.isBefore(windowStart) || day.isAfter(today)) {
                continue;
            }
            earningsByDay.merge(day, entry.getAmount(), BigDecimal::add);
            long views = entry.getRecordedViews() != null ? entry.getRecordedViews() : 0L;
            viewsByDay.merge(day, views, Long::sum);
        }

        List<DailyPartnerEarningsDTO> timeline = new ArrayList<>(EARNINGS_TIMELINE_DAYS);
        for (LocalDate day = windowStart; !day.isAfter(today); day = day.plusDays(1)) {
            timeline.add(new DailyPartnerEarningsDTO(
                    day.toString(),
                    earningsByDay.getOrDefault(day, BigDecimal.ZERO),
                    viewsByDay.getOrDefault(day, 0L)
            ));
        }
        return timeline;
    }
}
