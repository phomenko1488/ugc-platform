package com.platform.ugc.telegram;

/**
 * The tiny slice of a Telegram {@code Update} (from {@code getUpdates}) this module actually
 * reads — just enough to dispatch {@code /start[ payload]} commands. Everything else in the raw
 * JSON payload (photos, stickers, edited messages, callback queries, ...) is ignored.
 */
public record TelegramUpdate(
        long updateId,
        Long chatId,
        String username,
        String firstName,
        String text
) {
}
