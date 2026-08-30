package com.platform.ugc.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Real implementation, gated by {@code platform.telegram.enabled} (default {@code false}): with
 * the flag off, every call is logged to the console instead of making an HTTP request — the
 * safe default for dev/CI/sandboxed environments with no outbound access to
 * {@code api.telegram.org}. Flip the flag on (with a real {@code app.telegram.bot-token}) once
 * deployed somewhere with real network access and a real bot.
 */
@Slf4j
@Component
public class TelegramBotClientImpl implements TelegramBotClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String botToken;
    private final String apiBase;
    private final boolean enabled;

    public TelegramBotClientImpl(
            @Value("${app.telegram.bot-token}") String botToken,
            @Value("${app.telegram.api-base:https://api.telegram.org}") String apiBase,
            @Value("${platform.telegram.enabled:false}") boolean enabled
    ) {
        this.botToken = botToken;
        this.apiBase = apiBase;
        this.enabled = enabled;
    }

    @Override
    public void sendMessage(Long chatId, String text) {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] chatId={} text=\"{}\"", chatId, text);
            return;
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.put("chat_id", chatId);
        body.put("text", text);
        post("sendMessage", body);
    }

    @Override
    public void sendMessageWithWebAppButton(Long chatId, String text, String buttonLabel, String webAppUrl) {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] chatId={} text=\"{}\" button=\"{}\" -> {}", chatId, text, buttonLabel, webAppUrl);
            return;
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.put("chat_id", chatId);
        body.put("text", text);

        ObjectNode replyMarkup = objectMapper.createObjectNode();
        ArrayNode rows = replyMarkup.putArray("inline_keyboard");
        ArrayNode row = rows.addArray();
        ObjectNode button = row.addObject();
        button.put("text", buttonLabel);
        button.putObject("web_app").put("url", webAppUrl);
        body.set("reply_markup", replyMarkup);

        post("sendMessage", body);
    }

    @Override
    public List<TelegramUpdate> getUpdates(long offset, int timeoutSeconds) {
        if (!enabled) {
            return List.of();
        }
        try {
            String url = apiBase + "/bot" + botToken + "/getUpdates?offset=" + offset + "&timeout=" + timeoutSeconds;
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            return parseUpdates(response);
        } catch (Exception e) {
            log.warn("Telegram getUpdates failed: {}", e.getMessage());
            return List.of();
        }
    }

    private List<TelegramUpdate> parseUpdates(JsonNode response) {
        List<TelegramUpdate> updates = new ArrayList<>();
        if (response == null || !response.path("ok").asBoolean(false)) {
            return updates;
        }
        for (JsonNode item : response.path("result")) {
            JsonNode message = item.path("message");
            if (message.isMissingNode()) {
                continue; // Not a text message (could be an edited_message, callback_query, etc.) — ignored.
            }
            long updateId = item.path("update_id").asLong();
            Long chatId = message.path("chat").path("id").isMissingNode() ? null : message.path("chat").path("id").asLong();
            String username = message.path("from").path("username").asText(null);
            String firstName = message.path("from").path("first_name").asText(null);
            String text = message.path("text").asText(null);
            updates.add(new TelegramUpdate(updateId, chatId, username, firstName, text));
        }
        return updates;
    }

    private void post(String method, ObjectNode body) {
        try {
            String url = apiBase + "/bot" + botToken + "/" + method;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForObject(url, new HttpEntity<>(body.toString(), headers), String.class);
        } catch (Exception e) {
            log.warn("Telegram API call [{}] failed: {}", method, e.getMessage());
        }
    }
}
