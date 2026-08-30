package com.platform.ugc.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequestDTO(
        @NotBlank(message = "Email обязателен")
        @Email(message = "Некорректный формат email адреса")
        String email
) {
}
