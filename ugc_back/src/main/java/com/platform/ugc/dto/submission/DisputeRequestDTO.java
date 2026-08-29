package com.platform.ugc.dto.submission;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code POST /api/v1/submissions/{submissionId}/dispute}. {@code reason} is the picked
 * category (e.g. "Фрод/Накрутка", "Нарушение ТЗ", "Нецелевое ГЕО") — free text rather than an enum
 * since the category list is presentation-owned and may grow without a backend redeploy.
 */
public record DisputeRequestDTO(
        @NotBlank(message = "Причина спора обязательна")
        @Size(max = 64, message = "Причина не должна превышать 64 символа")
        String reason,

        @Size(max = 512, message = "Комментарий не должен превышать 512 символов")
        String comment
) {}
