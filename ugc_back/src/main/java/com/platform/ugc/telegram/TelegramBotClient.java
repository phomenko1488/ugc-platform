package com.platform.ugc.telegram;

import java.util.List;

/**
 * Thin wrapper over the two Telegram Bot API calls this module needs: pushing a message (with an
 * optional "Open Mini App" inline button) and long-polling for new updates. See
 * {@link TelegramBotClientImpl} for the {@code platform.telegram.enabled} dev-safe fallback.
 */
public interface TelegramBotClient {

    /** Sends a plain text message to a chat. */
    void sendMessage(Long chatId, String text);

    /**
     * Sends a text message with a single inline "Open Mini App" WebApp button beneath it —
     * used for the {@code /start} and {@code /start ref_TAG} welcome replies.
     */
    void sendMessageWithWebAppButton(Long chatId, String text, String buttonLabel, String webAppUrl);

    /** Long-polls {@code getUpdates} starting after {@code offset}; returns the raw updates received. */
    List<TelegramUpdate> getUpdates(long offset, int timeoutSeconds);
}
