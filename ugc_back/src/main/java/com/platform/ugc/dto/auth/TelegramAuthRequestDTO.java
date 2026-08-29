package com.platform.ugc.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Payload of POST /api/v1/auth/tg-webapp — the raw {@code window.Telegram.WebApp.initData} string. */
public record TelegramAuthRequestDTO(
        @NotBlank String initData
) {
}
