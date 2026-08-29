package com.platform.ugc.security;

/** Thrown when Telegram WebApp {@code initData} fails HMAC verification, is stale, or is malformed. */
public class TelegramAuthException extends RuntimeException {
    public TelegramAuthException(String message) {
        super(message);
    }
}
