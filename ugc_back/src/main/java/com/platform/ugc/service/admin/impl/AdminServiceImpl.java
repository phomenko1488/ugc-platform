package com.platform.ugc.service.admin.impl;

import com.platform.ugc.dto.admin.*;
import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.payout.PayoutRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.admin.AdminService;
import com.platform.ugc.service.payout.PayoutService;
import com.platform.ugc.service.setting.PlatformSettingsService;
import com.platform.ugc.service.submission.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Stream;

/**
 * Backs the Admin Back-Office ({@code /modules/admin}). Follows the same "delivered convention"
 * (APPROVED/PAID submissions only) established by {@code AdvertiserAnalyticsService} and
 * {@code PartnerAnalyticsServiceImpl} for every turnover/spend figure here, since this is the
 * platform-wide superset of exactly the same computation those two already do per-advertiser and
 * per-partner.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private static final int PROFIT_TIMELINE_DAYS = 30;

    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final SubmissionRepository submissionRepository;
    private final FinancialLedgerRepository ledgerRepository;
    private final PayoutRepository payoutRepository;
    private final PlatformRepository platformRepository;
    private final GeoCountryRepository geoCountryRepository;
    private final PlatformSettingsService platformSettingsService;
    private final PayoutService payoutService;
    private final SubmissionService submissionService;

    // ---------------------------------------------------------------- Dashboard

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardDTO getDashboard() {
        List<User> allUsers = userRepository.findAll();
        BigDecimal totalAvailableUserBalances = allUsers.stream()
                .map(User::getAvailableBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalWorkersHoldLiability = allUsers.stream()
                .map(User::getHoldBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Submission> delivered = loadDeliveredSubmissions();
        BigDecimal platformGrossTurnover = delivered.stream().map(this::grossCostOf).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalWorkerPayout = delivered.stream().map(this::workerPayoutOf).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformGrossSpread = platformGrossTurnover.subtract(totalWorkerPayout);

        List<FinancialLedgerEntry> b2cEntries = ledgerRepository.findAllByEntryType(FinancialLedgerEntry.EntryType.B2C_REFERRAL_COMMISSION);
        List<FinancialLedgerEntry> b2bEntries = ledgerRepository.findAllByEntryType(FinancialLedgerEntry.EntryType.B2B_PARTNER_COMMISSION);
        BigDecimal totalCommissions = Stream.concat(b2cEntries.stream(), b2bEntries.stream())
                .map(FinancialLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformNetProfit = platformGrossSpread.subtract(totalCommissions);

        long pendingPayoutsCount = payoutRepository.countByStatus(Payout.Status.PENDING);
        BigDecimal pendingPayoutsAmount = payoutRepository.findAllByStatusOrderByCreatedAtDesc(Payout.Status.PENDING).stream()
                .map(Payout::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AdminDashboardDTO(
                platformGrossTurnover,
                platformNetProfit,
                totalWorkersHoldLiability,
                totalAvailableUserBalances,
                allUsers.size(),
                submissionRepository.count(),
                offerRepository.findAllByIsActiveTrue().size(),
                pendingPayoutsCount,
                pendingPayoutsAmount,
                buildProfitTimeline(delivered, b2cEntries, b2bEntries)
        );
    }

    // ---------------------------------------------------------------- Ledger feed

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AdminLedgerEntryDTO> getGlobalLedger(String entryType, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FinancialLedgerEntry> entries = (entryType != null && !entryType.isBlank())
                ? ledgerRepository.findAllByEntryType(FinancialLedgerEntry.EntryType.valueOf(entryType), pageable)
                : ledgerRepository.findAll(pageable);
        return PageResponseDTO.of(entries.map(AdminLedgerEntryDTO::fromEntity));
    }

    // ---------------------------------------------------------------- Users

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AdminUserSummaryDTO> getUsers(Role role, String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by(Sort.Direction.ASC, "id"));
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        Page<User> users = userRepository.searchUsers(role, normalizedSearch, pageable);
        return PageResponseDTO.of(users.map(AdminUserSummaryDTO::fromEntity));
    }

    @Override
    @Transactional
    public void setUserBanStatus(Long userId, boolean isBanned) {
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));
        user.setIsBanned(isBanned);
        userRepository.save(user);

        if (isBanned && user.getRoles().contains(Role.ROLE_WORKER)) {
            // "При бане воркера все его активные холды могут быть аннулированы в пользу
            // офферов" — every submission still holding platform money gets annulled via the
            // existing rejectSubmission path, which already knows how to return holdAmount to
            // worker.holdBalance -> 0 and offer.remainingBudget, exactly the reversal this needs.
            List<Submission> activeHolds = submissionRepository.findAllByWorkerIdAndStatusIn(
                    userId, List.of(Submission.Status.PENDING_REVIEW, Submission.Status.TRACKING, Submission.Status.DISPUTED));
            for (Submission submission : activeHolds) {
                submissionService.rejectSubmission(submission.getId(), "Аннулировано: аккаунт воркера заблокирован администратором");
            }
            log.info("Пользователь #{} заблокирован, аннулировано холдов: {}", userId, activeHolds.size());
        } else {
            log.info("Статус блокировки пользователя #{} изменен: isBanned={}", userId, isBanned);
        }
    }

    @Override
    @Transactional
    public void adjustUserBalance(Long userId, BigDecimal amount, String comment) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Сумма корректировки должна быть отлична от нуля.");
        }
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));

        BigDecimal newBalance = user.getAvailableBalance().add(amount);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Корректировка увела бы баланс в минус.");
        }
        user.setAvailableBalance(newBalance);
        userRepository.save(user);

        ledgerRepository.save(FinancialLedgerEntry.builder()
                .user(user)
                .entryType(FinancialLedgerEntry.EntryType.ADMIN_BALANCE_ADJUSTMENT)
                .amount(amount)
                .description(comment != null && !comment.isBlank() ? comment : "Ручная корректировка администратором")
                .build());

        log.info("Баланс пользователя #{} скорректирован администратором на ${}", userId, amount);
    }

    @Override
    @Transactional
    public void updatePartnerTerms(Long userId, B2BPartnerTerms terms) {
        if (terms == null) {
            throw new IllegalArgumentException("Условия комиссии не переданы.");
        }
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));
        if (!user.getRoles().contains(Role.ROLE_PARTNER)) {
            throw new IllegalArgumentException("Пользователь [ID: " + userId + "] не является B2B-партнером.");
        }
        user.setB2bPartnerTerms(terms);
        userRepository.save(user);
        log.info("Условия B2B-партнера #{} обновлены администратором: {} {}%", userId, terms.getCommissionType(), terms.getCommissionRate());
    }

    // ---------------------------------------------------------------- Payout desk (listing only — mutations live in PayoutService)

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PayoutResponseDTO> getPayouts(Payout.Status status, int page, int size) {
        return payoutService.getAllPayouts(status, page, size);
    }

    // ---------------------------------------------------------------- Offer monitoring

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AdminOfferSummaryDTO> getAllOffers(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by(Sort.Direction.DESC, "id"));
        Page<Offer> offers = offerRepository.findAll(pageable);
        return PageResponseDTO.of(offers.map(AdminOfferSummaryDTO::fromEntity));
    }

    @Override
    @Transactional
    public void setOfferStatus(Long offerId, boolean isActive) {
        // Deliberately bypasses OfferServiceImpl.setOfferActiveStatus's advertiser-ownership
        // check — an admin force-pausing/resuming an offer isn't the advertiser and shouldn't
        // need to impersonate one to do it.
        Offer offer = offerRepository.findByIdWithLock(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));
        offer.setIsActive(isActive);
        offerRepository.save(offer);
        log.info("Статус оффера #{} изменен администратором: isActive={}", offerId, isActive);
    }

    // ---------------------------------------------------------------- Reference data: platforms

    @Override
    @Transactional(readOnly = true)
    public List<AdminPlatformDTO> getAllPlatforms() {
        return platformRepository.findAll().stream()
                .map(AdminPlatformDTO::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public AdminPlatformDTO createPlatform(PlatformCreateRequestDTO request) {
        if (request.code() == null || request.code().isBlank()) {
            throw new IllegalArgumentException("Код платформы обязателен.");
        }
        if (platformRepository.findByCode(request.code().trim().toUpperCase()).isPresent()) {
            throw new IllegalArgumentException("Платформа с кодом " + request.code() + " уже существует.");
        }
        PlatformEntity saved = platformRepository.save(PlatformEntity.builder()
                .code(request.code().trim().toUpperCase())
                .displayName(request.displayName())
                .urlRegexPattern(request.urlRegexPattern())
                .providerBeanName(request.providerBeanName())
                .isEnabled(true)
                .build());
        log.info("Администратор добавил новую платформу: {}", saved.getCode());
        return AdminPlatformDTO.fromEntity(saved);
    }

    @Override
    @Transactional
    public AdminPlatformDTO togglePlatform(Long id) {
        PlatformEntity platform = platformRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Платформа не найдена: " + id));
        platform.setIsEnabled(!Boolean.TRUE.equals(platform.getIsEnabled()));
        platformRepository.save(platform);
        return AdminPlatformDTO.fromEntity(platform);
    }

    // ---------------------------------------------------------------- Reference data: GEOs

    @Override
    @Transactional(readOnly = true)
    public List<AdminGeoDTO> getAllGeos() {
        return geoCountryRepository.findAll().stream()
                .map(AdminGeoDTO::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public AdminGeoDTO createGeo(GeoCreateRequestDTO request) {
        if (request.isoCode() == null || request.isoCode().isBlank()) {
            throw new IllegalArgumentException("ISO-код страны обязателен.");
        }
        if (geoCountryRepository.findByIsoCode(request.isoCode().trim().toUpperCase()).isPresent()) {
            throw new IllegalArgumentException("Страна с кодом " + request.isoCode() + " уже существует.");
        }
        GeoCountry saved = geoCountryRepository.save(GeoCountry.builder()
                .isoCode(request.isoCode().trim().toUpperCase())
                .name(request.name())
                .tier(request.tier() != null ? request.tier() : 3)
                .isEnabled(true)
                .build());
        log.info("Администратор добавил новую страну: {}", saved.getIsoCode());
        return AdminGeoDTO.fromEntity(saved);
    }

    @Override
    @Transactional
    public AdminGeoDTO toggleGeo(Long id) {
        GeoCountry geo = geoCountryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Страна не найдена: " + id));
        geo.setIsEnabled(!Boolean.TRUE.equals(geo.getIsEnabled()));
        geoCountryRepository.save(geo);
        return AdminGeoDTO.fromEntity(geo);
    }

    // ---------------------------------------------------------------- Settings

    @Override
    @Transactional
    public void updateDefaultMargin(BigDecimal marginPercentage) {
        platformSettingsService.updateMargin(marginPercentage);
    }

    // ---------------------------------------------------------------- Shared helpers

    private List<Submission> loadDeliveredSubmissions() {
        return submissionRepository.findAll().stream()
                .filter(s -> s.getStatus() == Submission.Status.APPROVED || s.getStatus() == Submission.Status.PAID)
                .toList();
    }

    /** {@code viewsInMillions * offer.advertiserCpmRate} — the advertiser's gross ad spend for one submission. */
    private BigDecimal grossCostOf(Submission submission) {
        return viewsInMillions(submission).multiply(submission.getOffer().getAdvertiserCpmRate());
    }

    /** {@code viewsInMillions * offer.workerCpmRate} — what the worker was actually paid for one submission. */
    private BigDecimal workerPayoutOf(Submission submission) {
        return viewsInMillions(submission).multiply(submission.getOffer().getWorkerCpmRate());
    }

    private BigDecimal viewsInMillions(Submission submission) {
        // Views Capping: settle on payableViews (mirrors FinancialSettlementEngine) so the
        // Back-Office's platform-margin/profit figures match what was actually settled to the
        // ledger, not the raw (possibly-capped-down) video views.
        long views = submission.getPayableViews() != null ? submission.getPayableViews()
                : (submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L);
        return BigDecimal.valueOf(views).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
    }

    /**
     * 30-day daily {gross turnover, net profit} series. Submissions are bucketed by
     * {@code updatedAt} (the moment they last transitioned status — settlement into
     * APPROVED/PAID, in practice) since there's no dedicated "settledAt" column; ledger entries
     * are bucketed by their own {@code createdAt}, which is written in the same settlement
     * transaction and so falls on the same day in practice.
     */
    private List<DailyProfitPointDTO> buildProfitTimeline(List<Submission> delivered, List<FinancialLedgerEntry> b2cEntries, List<FinancialLedgerEntry> b2bEntries) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate windowStart = today.minusDays(PROFIT_TIMELINE_DAYS - 1L);

        Map<LocalDate, BigDecimal> turnoverByDay = new HashMap<>();
        Map<LocalDate, BigDecimal> spreadByDay = new HashMap<>();
        for (Submission submission : delivered) {
            Instant ts = submission.getUpdatedAt();
            if (ts == null) continue;
            LocalDate day = ts.atZone(ZoneOffset.UTC).toLocalDate();
            if (day.isBefore(windowStart) || day.isAfter(today)) continue;

            BigDecimal gross = grossCostOf(submission);
            BigDecimal spread = gross.subtract(workerPayoutOf(submission));
            turnoverByDay.merge(day, gross, BigDecimal::add);
            spreadByDay.merge(day, spread, BigDecimal::add);
        }

        Map<LocalDate, BigDecimal> commissionByDay = new HashMap<>();
        for (FinancialLedgerEntry entry : concat(b2cEntries, b2bEntries)) {
            Instant ts = entry.getCreatedAt();
            if (ts == null) continue;
            LocalDate day = ts.atZone(ZoneOffset.UTC).toLocalDate();
            if (day.isBefore(windowStart) || day.isAfter(today)) continue;
            commissionByDay.merge(day, entry.getAmount(), BigDecimal::add);
        }

        List<DailyProfitPointDTO> timeline = new ArrayList<>(PROFIT_TIMELINE_DAYS);
        for (LocalDate day = windowStart; !day.isAfter(today); day = day.plusDays(1)) {
            BigDecimal turnover = turnoverByDay.getOrDefault(day, BigDecimal.ZERO);
            BigDecimal spread = spreadByDay.getOrDefault(day, BigDecimal.ZERO);
            BigDecimal commission = commissionByDay.getOrDefault(day, BigDecimal.ZERO);
            timeline.add(new DailyProfitPointDTO(day.toString(), turnover, spread.subtract(commission)));
        }
        return timeline;
    }

    private List<FinancialLedgerEntry> concat(List<FinancialLedgerEntry> a, List<FinancialLedgerEntry> b) {
        List<FinancialLedgerEntry> merged = new ArrayList<>(a.size() + b.size());
        merged.addAll(a);
        merged.addAll(b);
        return merged;
    }
}
