//package com.platform.ugc.telegram;
//
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.telegram.telegrambots.meta.TelegramBotsApi;
//import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
//import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;
//
//@Slf4j
//@Configuration
//public class TelegramBotConfig {
//
//    @Bean
//    public TelegramBotsApi telegramBotsApi(TelegramBotService botService) throws TelegramApiException {
//        TelegramBotsApi botsApi = new TelegramBotsApi(DefaultBotSession.class);
//        try {
//            botsApi.registerBot(botService);
//            log.info("✅ Telegram Bot successfully registered and polling started for @{}", botService.getBotUsername());
//        } catch (TelegramApiException e) {
//            log.error("❌ Failed to register Telegram Bot", e);
//            throw e;
//        }
//        return botsApi;
//    }
//}