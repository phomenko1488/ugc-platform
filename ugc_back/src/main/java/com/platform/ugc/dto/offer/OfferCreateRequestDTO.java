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

        @NotNull(message = "Ставка нарезчика обязательна")
        @DecimalMin(value = "1.00", message = "Минимальная ставка воркера $1.00 за 1M")
        BigDecimal workerCpmRate,

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

        @NotEmpty(message = "Укажите разрешенные платформы")
        Set<Long> platformIds,

        @NotEmpty(message = "Укажите целевые ГЕО")
        Set<Long> geoIds
) {}