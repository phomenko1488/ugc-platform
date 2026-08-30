package com.platform.ugc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling powers HoldSettlementScheduler's every-minute auto-settlement sweep, and
// (Telegram Bot Engine) TelegramUpdatePoller's getUpdates long-poll.
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
