package com.platform.ugc.telegram;

import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Async, best-effort push notifications over Telegram — a user with no {@code telegramId} bound
 * (or, in dev/CI, {@code platform.telegram.enabled=false}) simply doesn't get one; nothing here
 * ever throws back into the calling business transaction. HTML-formatted via
 * {@link TelegramBotService#sendNotification(Long, String)} /
 * {@link TelegramBotService#sendNotificationWithButton(Long, String, String, String)}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final TelegramBotService botService;
    private final UserRepository userRepository;

    // --- Worker (ROLE_WORKER) -------------------------------------------------------------

    @Async
    public void notifySubmissionApproved(User worker, String offerTitle, BigDecimal amount) {
        if (worker.getTelegramId() == null) return;
        botService.sendNotification(worker.getTelegramId(),
                "✅ Ваше видео по офферу «" + escape(offerTitle) + "» прошло модерацию и переведено в холд.\n" +
                        "Сумма холда: <b>$" + amount + "</b>.\n" +
                        "Средства будут разморожены автоматически по истечении периода холда, либо раньше — " +
                        "если рекламодатель не оспорит ролик.");
    }

    @Async
    public void notifySubmissionRejected(User worker, String offerTitle, String reason) {
        if (worker.getTelegramId() == null) return;
        botService.sendNotification(worker.getTelegramId(),
                "❌ Ваше видео по офферу «" + escape(offerTitle) + "» отклонено модерацией.\n" +
                        "Причина: " + escape(safe(reason)) + ".");
    }

    @Async
    public void notifyHoldSettled(User worker, BigDecimal amount) {
        if (worker.getTelegramId() == null) return;
        botService.sendNotification(worker.getTelegramId(),
                "💰 Холд разморожен. На ваш баланс зачислено <b>$" + amount + "</b>.");
    }

    @Async
    public void notifyPayoutCompleted(User worker, BigDecimal amount, String txHash) {
        if (worker.getTelegramId() == null) return;
        String tronscanUrl = "https://tronscan.org/#/transaction/" + txHash;
        botService.sendNotificationWithButton(worker.getTelegramId(),
                "✅ Выплата на сумму <b>$" + amount + "</b> USDT (TRC-20) выполнена.",
                "🔗 Посмотреть на Tronscan", tronscanUrl);
    }

    // --- Advertiser (ROLE_ADVERTISER) -----------------------------------------------------

    @Async
    public void notifyLowBudget(User advertiser, String offerTitle, BigDecimal remainingBudget) {
        if (advertiser.getTelegramId() == null) return;
        botService.sendNotification(advertiser.getTelegramId(),
                "⚠️ Остаток бюджета кампании «" + escape(offerTitle) + "» — <b>$" + remainingBudget +
                        "</b> (менее 15% от изначального бюджета). Рекомендуем пополнить бюджет, чтобы кампания не остановилась.");
    }

    @Async
    public void notifyNewSubmission(User advertiser, String offerTitle, String workerName) {
        if (advertiser.getTelegramId() == null) return;
        botService.sendNotification(advertiser.getTelegramId(),
                "🆕 Новая сдача ролика по кампании «" + escape(offerTitle) + "» от воркера @" + escape(safe(workerName)) + ".");
    }

    @Async
    public void notifyDisputeResolved(User advertiser, Long submissionId, boolean approved) {
        if (advertiser.getTelegramId() == null) return;
        String verdict = approved
                ? "✅ решен в пользу воркера — выплата произведена"
                : "❌ решен в вашу пользу — ролик отклонен, средства возвращены в бюджет";
        botService.sendNotification(advertiser.getTelegramId(),
                "⚖️ Спор по заявке #" + submissionId + " рассмотрен модерацией: " + verdict + ".");
    }

    // --- B2B Partner (ROLE_PARTNER) -------------------------------------------------------

    @Async
    public void notifyPartnerCommission(User partner, BigDecimal amount, String advertiserName) {
        if (partner.getTelegramId() == null) return;
        botService.sendNotification(partner.getTelegramId(),
                "💼 Начислена RevShare-комиссия <b>$" + amount + "</b> по рекламодателю " + escape(safe(advertiserName)) + ".");
    }

    // --- Moderator / Admin (ROLE_MODERATOR, ROLE_ADMIN) -----------------------------------

    @Async
    @Transactional(readOnly = true)
    public void notifyNewSubmissionToReview(Long submissionId, String offerTitle, String platform, String videoUrl) {
        broadcastToStaff("🆕 Новая заявка #" + submissionId + " в очереди модерации.\n" +
                        "Оффер: «" + escape(offerTitle) + "» · Платформа: " + escape(safe(platform)) + ".",
                "🔎 Проверить", videoUrl);
    }

    @Async
    @Transactional(readOnly = true)
    public void notifyNewDisputeRaised(Long disputeId, Long submissionId, String offerTitle, String reason) {
        broadcastToStaff("⚖️ Рекламодатель открыл спор #" + disputeId + " по заявке #" + submissionId + " " +
                "(оффер «" + escape(offerTitle) + "»). Причина: " + escape(safe(reason)) + ".\n" +
                "Требуется повторный пересмотр модерацией.", null, null);
    }

    @Async
    @Transactional(readOnly = true)
    public void notifyQueueBacklogAlert(int pendingCount) {
        broadcastToStaff("🚨 В очереди модерации накопилось <b>" + pendingCount + "</b> необработанных заявок " +
                "(порог: 20). Требуется внимание модераторов.", null, null);
    }

    @Async
    @Transactional(readOnly = true)
    public void notifyWorkerFlagged(User worker, String reason) {
        broadcastToStaff("🚩 Подозрительная активность воркера " + escape(safe(worker.getUsername())) +
                " (ID: " + worker.getId() + "): " + escape(safe(reason)) + ".", null, null);
    }

    private void broadcastToStaff(String htmlText, String buttonText, String url) {
        for (Role role : new Role[]{Role.ROLE_MODERATOR, Role.ROLE_ADMIN}) {
            for (User staff : userRepository.findAllByRole(role)) {
                if (staff.getTelegramId() == null) continue;
                if (buttonText != null && url != null) {
                    botService.sendNotificationWithButton(staff.getTelegramId(), htmlText, buttonText, url);
                } else {
                    botService.sendNotification(staff.getTelegramId(), htmlText);
                }
            }
        }
    }

    private String safe(String s) {
        return s != null ? s : "—";
    }

    /** Minimal HTML-entity escaping for values interpolated into an {@code enableHtml(true)} message. */
    private String escape(String s) {
        if (s == null) return "—";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
