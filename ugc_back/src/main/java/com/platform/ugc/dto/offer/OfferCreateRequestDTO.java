package com.platform.ugc.dto.offer;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.Set;

public record OfferCreateRequestDTO(
        @NotBlank(message = "Название оффера обязательно")
        @Size(max = 128, message = "Название не должно превышать 128 символов")
        String title,

        String requirementsDescription,

        @NotNull(message = "Ставка рекламодателя обязательна")
        @DecimalMin(value = "1.00", message = "Минимальная ставка $1.00 за 1M")
        BigDecimal advertiserCpmRate,

        @NotNull(message = "Порог просмотров обязателен")
        @Min(value = 1000, message = "Минимальный порог просмотров от 1 000")
        Long minViewsThreshold,

        @DecimalMin(value = "0.00", message = "ER не может быть отрицательным")
        BigDecimal minEngagementRate,

        @NotNull(message = "Бюджет оффера обязателен")
        @DecimalMin(value = "10.00", message = "Минимальный бюджет $10.00")
        BigDecimal totalBudget,

        @Min(value = 1, message = "Минимальный срок холда — 1 день")
        Integer holdPeriodDays,

        // Views Capping (optional): caps how many views of a single video are payable, protecting
        // budget from one viral outlier. Null/omitted = uncapped.
        @Min(value = 1, message = "Ограничение просмотров на видео должно быть положительным")
        Long maxViewsCapPerVideo,

        @NotEmpty(message = "Укажите разрешенные платформы")
        Set<Long> platformIds,

        @NotEmpty(message = "Укажите целевые ГЕО")
        Set<Long> geoIds,

        // Media Kit & Assets (Offer Wizard step 1) — both optional, no dedicated upload flow yet,
        // just a link the advertiser pastes (Google Drive / Dropbox / TG-пак) and a set of
        // already-hosted banner/logo URLs.
        @Size(max = 512, message = "Ссылка на медиа-кит не должна превышать 512 символов")
        String mediaKitUrl,

        Set<String> brandAssetUrls
) {}