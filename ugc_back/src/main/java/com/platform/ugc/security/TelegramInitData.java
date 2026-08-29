package com.platform.ugc.security;

/**
 * Parsed + verified payload of a Telegram WebApp {@code initData} string.
 */
public record TelegramInitData(
        Long telegramId,
        String username,
        String firstName,
        String lastName,
        String languageCode,
        boolean isPremium
) {
}
