package com.platform.ugc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling powers HoldSettlementScheduler's every-minute auto-settlement sweep and
// TelegramQueueBacklogScheduler's moderation-queue-size check. The Telegram bot's own update
// long-polling is handled internally by the telegrambots client library (TelegramBotService),
// not by a Spring @Scheduled task.
// @EnableAsync powers every @Async push in TelegramNotificationService/EmailService so a slow or
// disabled notification channel never blocks the business transaction that triggered it.
@EnableScheduling
@EnableAsync
@SpringBootApplication
public class UgcApplication {

    public static void main(String[] args) {
        SpringApplication.run(UgcApplication.class, args);
    }

}
