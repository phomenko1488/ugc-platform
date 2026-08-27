package com.platform.ugc.dto.submission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SubmissionCreateRequestDTO(
        @NotNull(message = "ID воркера обязателен")
        Long workerId,

        @NotNull(message = "ID оффера обязателен")
        Long offerId,

        @NotNull(message = "ID платформы обязателен")
        Long platformId,

        @NotBlank(message = "Ссылка на видео обязательна")
        @Size(max = 1024, message = "Ссылка не должна превышать 1024 символа")
        String sourceUrl,

        Long declaredViews,

        @Size(max = 1024, message = "Ссылка на скриншот не должна превышать 1024 символа")
        String screenshotAssetUrl
) {}