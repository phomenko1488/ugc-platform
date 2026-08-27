package com.platform.ugc.dto.submission;

import jakarta.validation.constraints.Size;

public record ModerationActionDTO(
        @Size(max = 512, message = "Комментарий модератора не должен превышать 512 символов")
        String comment
) {}