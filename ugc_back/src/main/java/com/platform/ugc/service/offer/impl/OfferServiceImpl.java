package com.platform.ugc.service.offer.impl;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.offer.OfferCreateRequestDTO;
import com.platform.ugc.dto.offer.OfferResponseDTO;
import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.user.User;
import com.platform.ugc.model.setting.PlatformSettings;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.security.CurrentUserUtil;
import com.platform.ugc.service.offer.OfferService;
import com.platform.ugc.service.setting.PlatformSettingsService;
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
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class OfferServiceImpl implements OfferService {

    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final PlatformRepository platformRepository;
    private final GeoCountryRepository geoCountryRepository;
    private final PlatformSettingsService platformSettingsService;

    @Override
    @Transactional
    public Offer createOffer(Long advertiserId, OfferCreateRequestDTO request) {
        User advertiser = userRepository.findByIdWithLock(advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));

        // Worker payout is no longer entered by the advertiser — it's derived from the platform's
        // current margin (PlatformSettings), so the advertiser can only ever set a rate that
        // nets the platform its configured cut, and the platform's take rate can be tuned without
        // touching every advertiser's existing offers.
        PlatformSettings settings = platformSettingsService.getPlatformSettings();
        BigDecimal marginFraction = settings.getDefaultMarginPercentage()
                .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        BigDecimal workerCpmRate = request.advertiserCpmRate()
                .multiply(BigDecimal.ONE.subtract(marginFraction))
                .setScale(4, RoundingMode.HALF_UP);

        if (advertiser.getAvailableBalance().compareTo(request.totalBudget()) < 0) {
            throw new IllegalStateException("Недостаточно средств на балансе. Требуется: $" + request.totalBudget());
        }

        advertiser.setAvailableBalance(advertiser.getAvailableBalance().subtract(request.totalBudget()));
        userRepository.save(advertiser);

        Set<PlatformEntity> platforms = platformRepository.findAllByIdIn(request.platformIds());
        if (platforms.isEmpty()) {
            throw new IllegalArgumentException("Указанные платформы не найдены.");
        }

        Set<GeoCountry> geos = geoCountryRepository.findAllByIdIn(request.geoIds());
        if (geos.isEmpty()) {
            throw new IllegalArgumentException("Указанные ГЕО-локации не найдены.");
        }

        Offer offer = Offer.builder()
                .advertiser(advertiser)
                .title(request.title().trim())
                .requirementsDescription(request.requirementsDescription())
                .advertiserCpmRate(request.advertiserCpmRate())
                .workerCpmRate(workerCpmRate)
                .minViewsThreshold(request.minViewsThreshold())
                .maxViewsCapPerVideo(request.maxViewsCapPerVideo())
                .minEngagementRate(request.minEngagementRate() != null ? request.minEngagementRate() : new BigDecimal("2.50"))
                .totalBudget(request.totalBudget())
                .remainingBudget(request.totalBudget())
                .holdPeriodDays(request.holdPeriodDays() != null ? request.holdPeriodDays() : 7)
                .allowedPlatforms(platforms)
                .targetGeos(geos)
                .mediaKitUrl(request.mediaKitUrl() != null ? request.mediaKitUrl().trim() : null)
                .brandAssetUrls(request.brandAssetUrls() != null ? request.brandAssetUrls() : Set.of())
                .isActive(true)
                .build();

        Offer saved = offerRepository.save(offer);
        log.info("Создан оффер [ID: {}, Title: '{}', Budget: ${}, WorkerCPM: ${} (margin {}%)]",
                saved.getId(), saved.getTitle(), saved.getTotalBudget(), workerCpmRate, settings.getDefaultMarginPercentage());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Offer getById(Long id) {
        return offerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public OfferResponseDTO getOfferDetails(Long id) {
        return OfferResponseDTO.fromEntity(getById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferResponseDTO> getActiveOffersForWorkers() {
        return offerRepository.findActiveOffersWithBudget().stream()
                .map(OfferResponseDTO::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<OfferResponseDTO> getOffersByAdvertiser(Long advertiserId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "id"));
        Page<Offer> offers = offerRepository.findAllByAdvertiserId(advertiserId, pageable);
        return PageResponseDTO.of(offers.map(OfferResponseDTO::fromEntity));
    }

    @Override
    @Transactional
    public void setOfferActiveStatus(Long offerId, Long advertiserId, boolean isActive) {
        // This only ever proved "advertiserId owns this offer" — it never proved "the caller IS
        // advertiserId". Since advertiserId comes straight from a client-supplied @RequestParam,
        // any advertiser could pass ANOTHER advertiser's id + offerId and this check would pass
        // trivially. CurrentUserUtil closes the identity half.
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
        Offer offer = getById(offerId);
        if (!offer.getAdvertiser().getId().equals(advertiserId)) {
            throw new AccessDeniedException("Нет доступа к офферу.");
        }
        offer.setIsActive(isActive);
        offerRepository.save(offer);
    }

    @Override
    @Transactional
    public void topUpOfferBudget(Long offerId, Long advertiserId, BigDecimal additionalBudget) {
        // See setOfferActiveStatus above — same "checked the wrong thing" bug, but here it also
        // gated a financial mutation (debiting advertiserId's balance), not just a status flip.
        CurrentUserUtil.assertSelfOrAdmin(advertiserId);
        if (additionalBudget.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Сумма пополнения должна быть больше 0.");
        }

        Offer offer = offerRepository.findByIdWithLock(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));

        if (!offer.getAdvertiser().getId().equals(advertiserId)) {
            throw new AccessDeniedException("Нет доступа к офферу.");
        }

        User advertiser = userRepository.findByIdWithLock(advertiserId)
                .orElseThrow(() -> new IllegalArgumentException("Рекламодатель не найден: " + advertiserId));

        if (advertiser.getAvailableBalance().compareTo(additionalBudget) < 0) {
            throw new IllegalStateException("Недостаточно средств на балансе аккаунта.");
        }

        advertiser.setAvailableBalance(advertiser.getAvailableBalance().subtract(additionalBudget));
        userRepository.save(advertiser);

        offer.setTotalBudget(offer.getTotalBudget().add(additionalBudget));
        offer.setRemainingBudget(offer.getRemainingBudget().add(additionalBudget));
        offerRepository.save(offer);
    }

    @Override
    @Transactional
    public void deductBudget(Long offerId, BigDecimal amount) {
        Offer offer = offerRepository.findByIdWithLock(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));

        if (offer.getRemainingBudget().compareTo(amount) < 0) {
            throw new IllegalStateException("Недостаточно бюджета по офферу [ID: " + offerId + "]");
        }

        offer.setRemainingBudget(offer.getRemainingBudget().subtract(amount));
        offerRepository.save(offer);
    }

    @Override
    @Transactional
    public void refundBudget(Long offerId, BigDecimal amount) {
        Offer offer = offerRepository.findByIdWithLock(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Оффер не найден: " + offerId));

        offer.setRemainingBudget(offer.getRemainingBudget().add(amount));
        offerRepository.save(offer);
    }
}