package com.platform.ugc.email;

import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.user.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Sends via {@link JavaMailSender} when {@code platform.mail.enabled=true}; otherwise (the
 * dev/CI default) every email is rendered and logged to the console instead of dispatched — so
 * the registration/password-reset/payout/low-budget flows all remain fully exercisable without a
 * real SMTP relay configured. Every send happens off the calling thread ({@link Async}) so a slow
 * or unreachable mail server never blocks the business transaction (a registration, a payout
 * completion) that triggered it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${platform.mail.enabled:false}")
    private boolean enabled;

    @Value("${platform.mail.from:no-reply@ugcflow.local}")
    private String fromAddress;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Override
    @Async
    public void sendWelcomeEmail(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return; // Telegram-only workers have no email to send to.
        }
        String subject = "Добро пожаловать в UGC Flow!";
        String body = "Здравствуйте, " + displayName(user) + "!\n\n" +
                "Ваш аккаунт на платформе UGC Flow успешно создан.\n" +
                "Логин: " + user.getEmail() + "\n\n" +
                "Перейти в кабинет: " + frontendBaseUrl + "\n\n" +
                "— Команда UGC Flow";
        send(user.getEmail(), subject, body);
    }

    @Override
    @Async
    public void sendPasswordResetEmail(User user, String resetToken) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        String resetLink = frontendBaseUrl + "/reset-password?token=" + resetToken;
        String subject = "Восстановление пароля UGC Flow";
        String body = "Здравствуйте, " + displayName(user) + "!\n\n" +
                "Для вашего аккаунта была запрошена смена пароля. Если это были не вы — просто " +
                "проигнорируйте это письмо.\n\n" +
                "Ссылка для сброса пароля (действует ограниченное время):\n" + resetLink + "\n\n" +
                "— Команда UGC Flow";
        send(user.getEmail(), subject, body);
    }

    @Override
    @Async
    public void sendPayoutCompletedEmail(User user, Payout payout) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        String subject = "Выплата подтверждена — $" + payout.getAmount();
        String body = "Здравствуйте, " + displayName(user) + "!\n\n" +
                "Ваша заявка на выплату #" + payout.getId() + " на сумму $" + payout.getAmount() +
                " USDT (TRC-20) обработана.\n" +
                "Кошелек: " + payout.getTrc20Wallet() + "\n" +
                "Хэш транзакции: " + payout.getTxHash() + "\n\n" +
                "— Команда UGC Flow";
        send(user.getEmail(), subject, body);
    }

    @Override
    @Async
    public void sendLowBudgetAlert(User advertiser, Offer offer) {
        if (advertiser.getEmail() == null || advertiser.getEmail().isBlank()) {
            return;
        }
        BigDecimal remainingPct = offer.getTotalBudget().signum() == 0
                ? BigDecimal.ZERO
                : offer.getRemainingBudget().multiply(BigDecimal.valueOf(100))
                        .divide(offer.getTotalBudget(), 1, java.math.RoundingMode.HALF_UP);
        String subject = "Бюджет кампании «" + offer.getTitle() + "» на исходе";
        String body = "Здравствуйте, " + displayName(advertiser) + "!\n\n" +
                "Остаток бюджета кампании «" + offer.getTitle() + "» составляет " + remainingPct +
                "% (" + offer.getRemainingBudget() + " из " + offer.getTotalBudget() + " $).\n" +
                "Пополните бюджет, чтобы кампания не остановилась.\n\n" +
                "— Команда UGC Flow";
        send(advertiser.getEmail(), subject, body);
    }

    private String displayName(User user) {
        return user.getUsername() != null && !user.getUsername().isBlank() ? user.getUsername() : "пользователь";
    }

    private void send(String to, String subject, String body) {
        if (!enabled) {
            log.info("[EMAIL:disabled] to={} subject=\"{}\"\n{}", to, subject, body);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
            log.info("[EMAIL:sent] to={} subject=\"{}\"", to, subject);
        } catch (Exception e) {
            log.error("[EMAIL:failed] to={} subject=\"{}\": {}", to, subject, e.getMessage(), e);
        }
    }
}
