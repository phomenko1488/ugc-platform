package com.platform.ugc.service.setting;

import com.platform.ugc.model.setting.PlatformSettings;
import com.platform.ugc.repository.setting.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Single source of truth for platform-wide economics settings. {@link #getPlatformSettings()} is
 * the only way any other code should read the current margin — it self-heals if the table is
 * empty (fresh DB, or the one row got deleted) by creating the 25.00% default row on first read,
 * so {@code DataInitializer}'s seed and every later caller agree on the same row instead of two
 * independent "create if missing" paths racing each other.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformSettingsService {

    private static final BigDecimal DEFAULT_MARGIN_PERCENTAGE = new BigDecimal("25.00");

    private final PlatformSettingsRepository platformSettingsRepository;

    @Transactional
    public PlatformSettings getPlatformSettings() {
        return platformSettingsRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> {
                    log.info("Таблица platform_settings пуста — создаю запись по умолчанию ({}%).", DEFAULT_MARGIN_PERCENTAGE);
                    return platformSettingsRepository.save(PlatformSettings.builder()
                            .defaultMarginPercentage(DEFAULT_MARGIN_PERCENTAGE)
                            .build());
                });
    }

    /**
     * Admin Back-Office (AdminSettingsPage) — updates the single settings row's default margin.
     * Only future offers pick this up (OfferServiceImpl.createOffer reads it at creation time);
     * existing offers keep whatever worker/advertiser CPM split they were created with.
     */
    @Transactional
    public PlatformSettings updateMargin(BigDecimal marginPercentage) {
        if (marginPercentage == null || marginPercentage.compareTo(BigDecimal.ZERO) < 0
                || marginPercentage.compareTo(new BigDecimal("100")) >= 0) {
            throw new IllegalArgumentException("Маржа должна быть в диапазоне [0, 100).");
        }
        PlatformSettings settings = getPlatformSettings();
        settings.setDefaultMarginPercentage(marginPercentage);
        log.info("Дефолтная маржа платформы обновлена администратором: {}%", marginPercentage);
        return platformSettingsRepository.save(settings);
    }
}
