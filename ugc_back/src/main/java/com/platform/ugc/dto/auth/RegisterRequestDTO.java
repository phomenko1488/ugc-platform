package com.platform.ugc.dto.auth;

import com.platform.ugc.model.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Public self-registration — {@code POST /api/v1/auth/register}. Only {@code ROLE_ADVERTISER}
 * and {@code ROLE_PARTNER} may self-register this way (enforced in the controller, not here,
 * since a bean-validation annotation can't express "one of these two enum values"); Workers
 * register implicitly via the Telegram WebApp/bot flow, and Moderator/Admin accounts are
 * provisioned by an admin, never through a public endpoint.
 */
public record RegisterRequestDTO(
        @NotBlank(message = "Email обязателен")
        @Email(message = "Некорректный формат email адреса")
        @Size(max = 128, message = "Email не должен превышать 128 символов")
        String email,

        @NotBlank(message = "Пароль обязателен")
        @Size(min = 6, max = 64, message = "Пароль должен быть от 6 до 64 символов")
        String password,

        @Size(max = 64, message = "Имя пользователя не должно превышать 64 символа")
        String username,

        @NotNull(message = "Роль обязательна")
        Role role,

        // Optional affiliate tag: for role=ROLE_ADVERTISER, linking to a B2B partner's tag attaches
        // this advertiser to that partner (RevShare commission on their spend going forward).
        @Size(max = 32, message = "Реферальный тег не должен превышать 32 символа")
        String refTag
) {
}
