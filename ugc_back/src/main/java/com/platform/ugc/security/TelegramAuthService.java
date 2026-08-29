package com.platform.ugc.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;

/**
 * Validates Telegram WebApp {@code initData} per the official algorithm:
 * <pre>
 *   secret_key   = HMAC_SHA256(key = "WebAppData", message = bot_token)
 *   computed_hash = HMAC_SHA256(key = secret_key, message = data_check_string)
 * </pre>
 * where {@code data_check_string} is every received field except {@code hash}, sorted
 * alphabetically by key, joined as {@code key=value} with '\n'.
 *
 * @see <a href="https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app">
 *      Telegram Bot API: validating data received via the Mini App</a>
 */
@Slf4j
@Service
public class TelegramAuthService {

    private static final String HMAC_ALGO = "HmacSHA256";

    private final String botToken;
    private final long maxAgeSeconds;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TelegramAuthService(
            @Value("${app.telegram.bot-token}") String botToken,
            @Value("${app.telegram.init-data-max-age-seconds:86400}") long maxAgeSeconds
    ) {
        this.botToken = botToken;
        this.maxAgeSeconds = maxAgeSeconds;
    }

    /**
     * Verifies the signature (and freshness) of a raw {@code initData} query string and extracts
     * the embedded Telegram user.
     *
     * @throws TelegramAuthException if the signature is invalid, the payload is stale/malformed,
     *                                or no "user" field is present.
     */
    public TelegramInitData validate(String initData) {
        if (initData == null || initData.isBlank()) {
            throw new TelegramAuthException("initData отсутствует");
        }

        Map<String, String> params = parseQueryString(initData);

        String receivedHash = params.remove("hash");
        if (receivedHash == null || receivedHash.isBlank()) {
            throw new TelegramAuthException("initData не содержит hash");
        }

        String dataCheckString = buildDataCheckString(params);
        String computedHash = computeHash(dataCheckString);

        if (!constantTimeEquals(computedHash, receivedHash)) {
            throw new TelegramAuthException("Неверная подпись initData (HMAC-SHA256 mismatch)");
        }

        String authDateRaw = params.get("auth_date");
        if (authDateRaw != null) {
            long authDate = Long.parseLong(authDateRaw);
            long ageSeconds = Instant.now().getEpochSecond() - authDate;
            if (ageSeconds > maxAgeSeconds) {
                throw new TelegramAuthException("initData устарела (age=" + ageSeconds + "s)");
            }
        }

        String userJson = params.get("user");
        if (userJson == null || userJson.isBlank()) {
            throw new TelegramAuthException("initData не содержит поле user");
        }

        return parseUser(userJson);
    }

    private String buildDataCheckString(Map<String, String> params) {
        // TreeMap already gives alphabetical key ordering.
        TreeMap<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append('\n');
            }
            sb.append(entry.getKey()).append('=').append(entry.getValue());
        }
        return sb.toString();
    }

    private String computeHash(String dataCheckString) {
        try {
            Mac secretKeyMac = Mac.getInstance(HMAC_ALGO);
            secretKeyMac.init(new SecretKeySpec("WebAppData".getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] secretKey = secretKeyMac.doFinal(botToken.getBytes(StandardCharsets.UTF_8));

            Mac hashMac = Mac.getInstance(HMAC_ALGO);
            hashMac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            byte[] hashBytes = hashMac.doFinal(dataCheckString.getBytes(StandardCharsets.UTF_8));

            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            log.error("Failed to compute Telegram initData HMAC", e);
            throw new TelegramAuthException("Не удалось вычислить подпись initData");
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }

    private Map<String, String> parseQueryString(String raw) {
        Map<String, String> map = new TreeMap<>();
        for (String pair : raw.split("&")) {
            if (pair.isBlank()) continue;
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            String value = eq >= 0 ? pair.substring(eq + 1) : "";
            map.put(
                    URLDecoder.decode(key, StandardCharsets.UTF_8),
                    URLDecoder.decode(value, StandardCharsets.UTF_8)
            );
        }
        return map;
    }

    private TelegramInitData parseUser(String userJson) {
        try {
            JsonNode node = objectMapper.readTree(userJson);
            return new TelegramInitData(
                    node.path("id").asLong(),
                    node.path("username").asText(null),
                    node.path("first_name").asText(null),
                    node.path("last_name").asText(null),
                    node.path("language_code").asText(null),
                    node.path("is_premium").asBoolean(false)
            );
        } catch (Exception e) {
            throw new TelegramAuthException("Не удалось разобрать поле user в initData");
        }
    }
}
