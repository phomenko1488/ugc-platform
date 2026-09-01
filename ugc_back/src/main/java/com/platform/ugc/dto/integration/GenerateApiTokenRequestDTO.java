package com.platform.ugc.dto.integration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateApiTokenRequestDTO(
        @NotBlank(message = "Название токена обязательно")
        @Size(max = 64, message = "Название токена не должно превышать 64 символа")
        String label
) {
}
