package com.platform.ugc.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequestDTO(
        @NotBlank(message = "Токен обязателен")
        String token,

        @NotBlank(message = "Новый пароль обязателен")
        @Size(min = 6, max = 64, message = "Пароль должен быть от 6 до 64 символов")
        String newPassword
) {
}
