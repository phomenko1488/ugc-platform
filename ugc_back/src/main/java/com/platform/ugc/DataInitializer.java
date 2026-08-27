package com.platform.ugc;

import com.platform.ugc.model.offer.GeoCountry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.offer.GeoCountryRepository;
import com.platform.ugc.repository.offer.OfferRepository;
import com.platform.ugc.repository.offer.PlatformRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
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

    @Override
    @Transactional
    public void run(String... args) {
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
            User advertiser = userRepository.save(User.builder()
                    .username("Stake_Admin")
                    .email("adv@stake.com")
                    .availableBalance(new BigDecimal("10000.0000"))
                    .affiliateTag("adv_stake")
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
                    .roles(new HashSet<>(Collections.singleton(Role.ROLE_MODERATOR)))
                    .affiliateTag("mod_001")
                    .build());

            log.info("--- Сидинг тестового оффера ---");
            offerRepository.save(Offer.builder()
                    .advertiser(advertiser)
                    .title("Stake Plinko Stream Highlights")
                    .requirementsDescription("Разместить логотип в правом верхнем углу. Указать #wrk_777 в описании.")
                    .advertiserCpmRate(new BigDecimal("250.0000"))
                    .workerCpmRate(new BigDecimal("170.0000"))
                    .minViewsThreshold(50000L)
                    .minEngagementRate(new BigDecimal("2.50"))
                    .totalBudget(new BigDecimal("5000.0000"))
                    .remainingBudget(new BigDecimal("5000.0000"))
                    .holdPeriodDays(7)
                    .allowedPlatforms(Set.of(tiktok, ytShorts, reels))
                    .targetGeos(Set.of(ru, kz, by))
                    .isActive(true)
                    .build());

            log.info("Сидинг успешно завершен.");
        }
    }
}