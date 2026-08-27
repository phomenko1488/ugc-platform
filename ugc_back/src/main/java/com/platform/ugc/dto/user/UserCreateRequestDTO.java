package com.platform.ugc.dto.user;

import com.platform.ugc.model.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UserCreateRequestDTO(
        Long telegramId,

        @Email(message = "Некорректный формат email адреса")
        @Size(max = 128, message = "Email не должен превышать 128 символов")
        String email,

        @Size(min = 6, max = 64, message = "Пароль должен быть от 6 до 64 символов")
        String password,

        @Size(max = 64, message = "Имя пользователя не должно превышать 64 символа")
        String username,

        Role targetRole,

        @Size(max = 32, message = "Реферальный тег не должен превышать 32 символа")
        String refTag
) {}