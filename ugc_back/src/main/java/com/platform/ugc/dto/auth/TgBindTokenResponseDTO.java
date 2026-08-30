package com.platform.ugc.dto.auth;

import java.time.Instant;

/**
 * Response for {@code POST /api/v1/users/{userId}/tg-bind-token} — {@code deepLink} is ready to
 * hand straight to the frontend's "Link Telegram" button ({@code t.me/<bot>?start=bind_<token>});
 * the raw {@code token} is included too in case the frontend wants to render its own instructions.
 */
public record TgBindTokenResponseDTO(
        String token,
        String deepLink,
        Instant expiresAt
) {
}
