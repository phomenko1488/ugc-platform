package com.platform.ugc.adapter.stats;

import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.port.stats.PlatformStatsProvider;
import com.platform.ugc.port.stats.VideoStatsPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DynamicStatsProviderRegistry {

    private final ApplicationContext applicationContext;

    public VideoStatsPayload fetch(PlatformEntity platform, String url, String externalId) {
        String beanName = platform.getProviderBeanName();
        if (!applicationContext.containsBean(beanName)) {
            // Резервный вызов generic провайдера
            beanName = "genericSocialStatsProvider";
        }

        PlatformStatsProvider provider = applicationContext.getBean(beanName, PlatformStatsProvider.class);
        return provider.extractMetrics(url, externalId);
    }
}