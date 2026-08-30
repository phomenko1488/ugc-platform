package com.platform.ugc;

import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.setting.PlatformSettings;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.repository.setting.PlatformSettingsRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PlatformRepository platformRepository;
    private final GeoCountryRepository geoCountryRepository;
    private final UserRepository userRepository;
    private final OfferRepository offerRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final PasswordEncoder passwordEncoder;

    // Dev-only default password for every seeded email/password user (Module 1). Never do this in prod.
    private static final String DEV_SEED_PASSWORD = "password123";

    @Override
    @Transactional
    public void run(String... args) {
        if (platformSettingsRepository.count() == 0) {
            log.info("--- Сидинг настроек платформы (маржа по умолчанию 25.00%) ---");
            platformSettingsRepository.save(PlatformSettings.builder()
                    .defaultMarginPercentage(new BigDecimal("25.00"))
                    .build());
        }

        if (platformRepository.count() == 0) {
            log.info("--- Сидинг справочников платформ и ГЕО ---");
            PlatformEntity tiktok = platformRepository.save(PlatformEntity.builder()
                    .code("TIKTOK")
                    .displayName("TikTok")
                    .urlRegexPattern("(?:video/|vt\\.tiktok\\.com/|v/)([0-9]+|[A-Za-z0-9_-]+)")
                    .providerBeanName("genericSocialStatsProvider")
                    .isEnabled(true)
                    .build());

            PlatformEntity ytShorts = platformRepository.save(PlatformEntity.builder()
                    .code("YOUTUBE_SHORTS")
                    .displayName("YouTube Shorts")
                    .urlRegexPattern("(?:shorts/|v=|youtu\\.be/)([a-zA-Z0-9_-]{11})")
                    .providerBeanName("genericSocialStatsProvider")
                    .isEnabled(true)
                    .build());

            PlatformEntity reels = platformRepository.save(PlatformEntity.builder()
                    .code("INSTAGRAM_REELS")
                    .displayName("Instagram Reels")
                    .urlRegexPattern("/(?:reel|reels|p)/([A-Za-z0-9_-]+)")
                    .providerBeanName("genericSocialStatsProvider")
                    .isEnabled(true)
                    .build());

            GeoCountry ru = geoCountryRepository.save(GeoCountry.builder().isoCode("RUS").name("Russia").tier(2).build());
            GeoCountry kz = geoCountryRepository.save(GeoCountry.builder().isoCode("KAZ").name("Kazakhstan").tier(2).build());
            GeoCountry by = geoCountryRepository.save(GeoCountry.builder().isoCode("BLR").name("Belarus").tier(3).build());

            log.info("--- Сидинг пользователей ---");
            User partner = userRepository.save(User.builder()
                    .username("Alpha_Agency")
                    .email("partner@agency.com")
                    .passwordHash(passwordEncoder.encode(DEV_SEED_PASSWORD))
                    .availableBalance(new BigDecimal("250.0000"))
                    .affiliateTag("prt_alpha7")
                    .trc20Wallet("TPartnerUSDTTRC20WalletAddr000001X")
                    .b2bPartnerTerms(B2BPartnerTerms.builder()
                            .commissionType(B2BPartnerTerms.CommissionType.PERCENT_OF_PLATFORM_MARGIN)
                            .commissionRate(new BigDecimal("20.00"))
                            .isActive(true)
                            .build())
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_PARTNER)))
                    .build());

            User advertiser = userRepository.save(User.builder()
                    .username("Stake_Admin")
                    .email("adv@stake.com")
                    .passwordHash(passwordEncoder.encode(DEV_SEED_PASSWORD))
                    .availableBalance(new BigDecimal("10000.0000"))
                    .affiliateTag("adv_stake")
                    .b2bPartner(partner)
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_ADVERTISER)))
                    .build());

            User worker = userRepository.save(User.builder()
                    .username("Alex_Clipper")
                    .telegramId(77712345L)
                    .availableBalance(new BigDecimal("0.0000"))
                    .affiliateTag("wrk_777")
                    .trc20Wallet("TQj4xXy9Z1234567890123456789012345")
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_WORKER)))
                    .build());

            userRepository.save(User.builder()
                    .username("Mod_Chief")
                    .email("mod@platform.com")
                    .passwordHash(passwordEncoder.encode(DEV_SEED_PASSWORD))
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_MODERATOR)))
                    .affiliateTag("mod_001")
                    .build());

            userRepository.save(User.builder()
                    .username("Platform_Admin")
                    .email("admin@platform.com")
                    .passwordHash(passwordEncoder.encode(DEV_SEED_PASSWORD))
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_ADMIN)))
                    .affiliateTag("admin_001")
                    .build());

            log.info("--- Сидинг тестового оффера ---");
            offerRepository.save(Offer.builder()
                    .advertiser(advertiser)
                    .title("Stake Plinko Stream Highlights")
                    .requirementsDescription("Разместить логотип в правом верхнем углу. Указать #wrk_777 в описании.")
                    .mediaKitUrl("https://drive.google.com/drive/folders/demo_stake_pack")
                    .brandAssetUrls(Set.of("https://images.unsplash.com/photo-1518770660439-4636190af475?w=500"))
                    .advertiserCpmRate(new BigDecimal("250.0000"))
                    .workerCpmRate(new BigDecimal("187.5000"))
                    .minViewsThreshold(50000L)
                    .minEngagementRate(new BigDecimal("2.50"))
                    .totalBudget(new BigDecimal("5000.0000"))
                    .remainingBudget(new BigDecimal("5000.0000"))
                    .holdPeriodDays(7)
                    .allowedPlatforms(Set.of(tiktok, ytShorts, reels))
                    .targetGeos(Set.of(ru, kz, by))
                    .isActive(true)
                    .build());

            log.info("Сидинг успешно завершен. Dev-логины: adv@stake.com / mod@platform.com / partner@agency.com / admin@platform.com, пароль: {}", DEV_SEED_PASSWORD);
        }
    }
}