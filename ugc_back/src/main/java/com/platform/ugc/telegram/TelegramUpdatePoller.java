package com.platform.ugc.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Long-polls Telegram's {@code getUpdates} on a fixed delay and dispatches every {@code /start}
 * message it sees to {@link TelegramCommandService}. A no-op when
 * {@code platform.telegram.enabled=false} (the dev/CI default) — {@link TelegramBotClient}
 * itself returns an empty update list in that mode without making any HTTP call, so this
 * scheduler is safe to leave running everywhere.
 * <p>
 * The update offset is tracked in memory only (not persisted): acceptable for a single-instance
 * deployment, and means at most one poll's worth of updates could be re-delivered after a
 * restart — every handler here is idempotent enough not to care (re-registering an
 * already-registered worker, or re-binding an already-consumed token, both no-op safely).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelegramUpdatePoller {

    private final TelegramBotClient botClient;
    private final TelegramCommandService commandService;
    private final AtomicLong offset = new AtomicLong(0);

    @Value("${app.telegram.update-poll-timeout-seconds:0}")
    private int pollTimeoutSeconds;

    @Scheduled(fixedDelayString = "${app.telegram.update-poll-delay-ms:3000}")
    public void poll() {
        List<TelegramUpdate> updates = botClient.getUpdates(offset.get(), pollTimeoutSeconds);
        for (TelegramUpdate update : updates) {
            offset.set(update.updateId() + 1);
            dispatch(update);
        }
    }

    private void dispatch(TelegramUpdate update) {
        String text = update.text();
        if (text == null || !text.startsWith("/start")) {
            return; // Only /start[ payload] is handled — every other command/message is ignored.
        }
        String payload = text.length() > "/start".length() ? text.substring("/start".length()).trim() : null;
        try {
            commandService.handleStart(update.chatId(), update.username(), update.firstName(), payload);
        } catch (Exception e) {
            log.error("Failed to handle Telegram update #{}: {}", update.updateId(), e.getMessage(), e);
        }
    }
}
