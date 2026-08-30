package com.platform.ugc.telegram;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.telegram.telegrambots.meta.api.objects.webapp.WebAppInfo;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

import java.util.List;

/**
 * The bot itself — replaces the old hand-rolled {@code TelegramBotClient}/{@code TelegramUpdatePoller}
 * pair with the official {@code telegrambots} client (long-polling, via
 * {@code telegrambots-spring-boot-starter}). Registration is done explicitly in {@link #init()}
 * rather than relying on the starter's own auto-configuration, so this bean's behavior doesn't
 * depend on however that starter's Spring-Boot-version-specific wiring resolves.
 * <p>
 * Gated by {@code platform.telegram.enabled} (default {@code false}) — the same dev-safety switch
 * {@code EmailServiceImpl} uses for {@code platform.mail.enabled}. With it off, the bot never
 * calls {@code registerBot}/{@code execute} (no outbound calls to {@code api.telegram.org} at
 * all, which this sandbox has no route to anyway) and every outgoing push is logged instead.
 */
@Slf4j
@Service
public class TelegramBotService extends TelegramLongPollingBot {

    private static final String WEBAPP_BUTTON_LABEL = "🚀 Открыть UGC Flow";

    private final TelegramCommandService commandService;

    @Value("${telegram.bot.token:your_bot_token_here}")
    private String botToken;

    @Value("${telegram.bot.username:ugc_flow_bot}")
    private String botUsername;

    @Value("${telegram.bot.webapp-url:https://your-tunnel.trycloudflare.com}")
    private String webAppUrl;

    @Value("${platform.telegram.enabled:false}")
    private boolean enabled;

    // @Lazy: TelegramCommandService doesn't need this bot fully constructed to be built itself,
    // and this avoids any accidental circular-construction ordering surprise since both beans
    // live in the same small package and could grow a back-reference later.
    public TelegramBotService(@Lazy TelegramCommandService commandService) {
        this.commandService = commandService;
    }

    @PostConstruct
    public void init() {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] Bot polling not started (platform.telegram.enabled=false). " +
                    "Set it to true with a real telegram.bot.token to go live.");
            return;
        }
        try {
            TelegramBotsApi botsApi = new TelegramBotsApi(DefaultBotSession.class);
            botsApi.registerBot(this);
            log.info("Telegram bot @{} registered and long-polling for updates.", botUsername);
        } catch (TelegramApiException e) {
            log.error("Failed to register Telegram bot @{}: {}", botUsername, e.getMessage(), e);
        }
    }

    @Override
    public String getBotToken() {
        return botToken;
    }

    @Override
    public String getBotUsername() {
        return botUsername;
    }

    @Override
    public void onUpdateReceived(Update update) {
        if (update == null || !update.hasMessage() || !update.getMessage().hasText()) {
            return; // Only text messages matter here — photos, stickers, callback queries, etc. are ignored.
        }
        Message message = update.getMessage();
        String text = message.getText().trim();
        if (!text.startsWith("/start")) {
            return; // Only /start[ payload] is handled.
        }

        Long chatId = message.getChatId();
        var from = message.getFrom();
        Long tgUserId = from != null ? from.getId() : chatId;
        String username = from != null ? from.getUserName() : null;
        String firstName = from != null ? from.getFirstName() : null;

        String payload = text.length() > "/start".length() ? text.substring("/start".length()).trim() : "";

        try {
            if (payload.isEmpty()) {
                handlePlainStart(chatId, username, firstName);
            } else if (payload.startsWith("ref_")) {
                handleRefStart(chatId, tgUserId, username, payload.substring("ref_".length()));
            } else if (payload.startsWith("bind_")) {
                handleBindStart(chatId, tgUserId, username, payload.substring("bind_".length()));
            } else {
                handlePlainStart(chatId, username, firstName);
            }
        } catch (Exception e) {
            log.error("Failed to handle /start from chatId={}: {}", chatId, e.getMessage(), e);
        }
    }

    /** Чистый {@code /start} — просто приветствие с описанием платформы и кнопкой WebApp. */
    private void handlePlainStart(Long chatId, String username, String firstName) {
        String name = displayName(username, firstName);
        String text = "Добро пожаловать в UGC Flow, " + name + "! 🎬\n\n" +
                "<b>UGC Flow</b> — платформа, которая соединяет рекламодателей и авторов контента:\n" +
                "• 💸 <b>Воркерам</b> — зарабатывайте на заливе видео: берите оффер, снимаете ролик, " +
                "получаете оплату за просмотры.\n" +
                "• 📈 <b>Рекламодателям</b> — масштабируйте трафик через сеть воркеров с прозрачной " +
                "CPM-моделью и полным контролем бюджета.\n\n" +
                "Нажмите кнопку ниже, чтобы открыть приложение.";
        sendWithWebAppButton(chatId, text);
    }

    /** {@code /start ref_<affiliateTag>} — регистрация/авторизация воркера с привязкой реферала. */
    private void handleRefStart(Long chatId, Long tgUserId, String username, String affiliateTag) {
        var worker = commandService.processReferral(tgUserId, chatId, username, affiliateTag);
        String name = displayName(worker.getUsername(), username);
        String text = "Добро пожаловать в UGC Flow, " + name + "! 🎬\n\n" +
                (worker.getB2cReferrer() != null
                        ? "Вы зарегистрированы по реферальной ссылке — бонусы за вашу активность " +
                          "также получает пригласивший вас пользователь.\n\n"
                        : "") +
                "Нажмите кнопку ниже, чтобы начать зарабатывать.";
        sendWithWebAppButton(chatId, text);
    }

    /** {@code /start bind_<token>} — привязка Telegram-аккаунта к существующему веб-аккаунту. */
    private void handleBindStart(Long chatId, Long tgUserId, String username, String token) {
        var bound = commandService.processBinding(tgUserId, chatId, username, token);
        if (bound.isEmpty()) {
            sendNotification(chatId, "⚠️ Ссылка привязки недействительна, уже устарела, либо этот Telegram-аккаунт " +
                    "уже привязан к другому пользователю UGC Flow. Сгенерируйте новую ссылку в личном кабинете.");
            return;
        }
        sendWithWebAppButton(chatId, "✅ Ваш Telegram-аккаунт успешно привязан к личному кабинету! " +
                "Теперь уведомления платформы будут приходить сюда.");
    }

    private String displayName(String username, String firstName) {
        if (username != null && !username.isBlank()) return username;
        if (firstName != null && !firstName.isBlank()) return firstName;
        return "друг";
    }

    // --- Outbound notifications (called by TelegramNotificationService) -----------------------

    /** Sends an HTML-formatted message with link previews disabled. */
    public void sendNotification(Long chatId, String htmlText) {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] chatId={} text=\"{}\"", chatId, htmlText);
            return;
        }
        SendMessage message = new SendMessage();
        message.setChatId(String.valueOf(chatId));
        message.setText(htmlText);
        message.setParseMode("HTML");
        message.setDisableWebPagePreview(true);
        dispatch(message);
    }

    /** Sends an HTML-formatted message with a single inline link button beneath it. */
    public void sendNotificationWithButton(Long chatId, String htmlText, String buttonText, String url) {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] chatId={} text=\"{}\" button=\"{}\" -> {}", chatId, htmlText, buttonText, url);
            return;
        }
        SendMessage message = new SendMessage();
        message.setChatId(String.valueOf(chatId));
        message.setText(htmlText);
        message.setParseMode("HTML");
        message.setDisableWebPagePreview(true);

        InlineKeyboardButton button = new InlineKeyboardButton();
        button.setText(buttonText);
        button.setUrl(url);

        InlineKeyboardMarkup markup = new InlineKeyboardMarkup();
        markup.setKeyboard(List.of(List.of(button)));
        message.setReplyMarkup(markup);

        dispatch(message);
    }

    /** The {@code /start} welcome variants — plain text plus the "🚀 Открыть UGC Flow" WebApp button. */
    private void sendWithWebAppButton(Long chatId, String htmlText) {
        if (!enabled) {
            log.info("[TELEGRAM:disabled] chatId={} text=\"{}\" webAppButton -> {}", chatId, htmlText, webAppUrl);
            return;
        }
        SendMessage message = new SendMessage();
        message.setChatId(String.valueOf(chatId));
        message.setText(htmlText);
        message.setParseMode("HTML");
        message.setDisableWebPagePreview(true);

        InlineKeyboardButton button = new InlineKeyboardButton();
        button.setText(WEBAPP_BUTTON_LABEL);
        button.setWebApp(new WebAppInfo(webAppUrl));

        InlineKeyboardMarkup markup = new InlineKeyboardMarkup();
        markup.setKeyboard(List.of(List.of(button)));
        message.setReplyMarkup(markup);

        dispatch(message);
    }

    private void dispatch(SendMessage message) {
        try {
            execute(message);
        } catch (TelegramApiException e) {
            log.warn("Telegram sendMessage failed for chatId={}: {}", message.getChatId(), e.getMessage());
        }
    }
}
