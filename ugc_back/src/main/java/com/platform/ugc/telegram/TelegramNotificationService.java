package com.platform.ugc.telegram;

import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Async, best-effort push notifications over Telegram — a user with no {@code telegramId} bound
 * (or, in dev/CI, {@code platform.telegram.enabled=false}) simply doesn't get one; nothing here
 * ever throws back into the calling business transaction. Covers every push the pagination/
 * capping/registration initiative called for: worker moderation-approval, hold-release and payout
 * pushes; advertiser new-submission and low-budget pushes; partner RevShare pushes; moderator
 * new-dispute pushes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationService {

    private final TelegramBotClient botClient;
    private final UserRepository userRepository;

    @Async
    public void notifyWorkerModeratorApproved(Submission submission) {
        User worker = submission.getWorker();
        if (worker.getTelegramId() == null) return;
        botClient.sendMessage(worker.getTelegramId(),
                "✅ Ваше видео по офферу «" + submission.getOffer().getTitle() + "» прошло модерацию и переведено в холд. " +
                        "Выплата произойдет автоматически по истечении периода холда (" +
                        submission.getOffer().getHoldPeriodDays() + " дн.), либо раньше — если рекламодатель не оспорит его.");
    }

    @Async
    public void notifyWorkerHoldReleased(Submission submission) {
        User worker = submission.getWorker();
        if (worker.getTelegramId() == null) return;
        botClient.sendMessage(worker.getTelegramId(),
                "💰 Холд по видео из оффера «" + submission.getOffer().getTitle() + "» разморожен. " +
                        "На ваш баланс зачислено " + workerPayout(submission) + " $.");
    }

    @Async
    public void notifyPayoutCompleted(Payout payout) {
        User user = payout.getUser();
        if (user.getTelegramId() == null) return;
        botClient.sendMessage(user.getTelegramId(),
                "✅ Выплата на сумму " + payout.getAmount() + " $ USDT (TRC-20) выполнена.\n" +
                        "Кошелек: " + payout.getTrc20Wallet() + "\n" +
                        "Tx: " + payout.getTxHash());
    }

    @Async
    public void notifyAdvertiserNewSubmission(Submission submission) {
        User advertiser = submission.getOffer().getAdvertiser();
        if (advertiser.getTelegramId() == null) return;
        botClient.sendMessage(advertiser.getTelegramId(),
                "🆕 Новая заявка по кампании «" + submission.getOffer().getTitle() + "»: " +
                        submission.getRecordedViews() + " просмотров, воркер @" + safe(submission.getWorker().getUsername()) + ".");
    }

    @Async
    public void notifyAdvertiserLowBudget(Offer offer) {
        User advertiser = offer.getAdvertiser();
        if (advertiser.getTelegramId() == null) return;
        BigDecimal remainingPct = offer.getTotalBudget().signum() == 0
                ? BigDecimal.ZERO
                : offer.getRemainingBudget().multiply(BigDecimal.valueOf(100))
                        .divide(offer.getTotalBudget(), 1, RoundingMode.HALF_UP);
        botClient.sendMessage(advertiser.getTelegramId(),
                "⚠️ Остаток бюджета кампании «" + offer.getTitle() + "» — " + remainingPct + "% (" +
                        offer.getRemainingBudget() + " из " + offer.getTotalBudget() + " $). Рекомендуем пополнить бюджет.");
    }

    @Async
    public void notifyPartnerRevShare(User partner, BigDecimal amount, User advertiser) {
        if (partner.getTelegramId() == null) return;
        botClient.sendMessage(partner.getTelegramId(),
                "💼 Начислена RevShare-комиссия " + amount + " $ по рекламодателю " + safe(advertiser.getUsername()) + ".");
    }

    @Async
    @Transactional(readOnly = true)
    public void notifyModeratorsNewDispute(Submission submission) {
        for (User moderator : userRepository.findAllByRole(Role.ROLE_MODERATOR)) {
            if (moderator.getTelegramId() == null) continue;
            botClient.sendMessage(moderator.getTelegramId(),
                    "⚖️ Новый спор по заявке #" + submission.getId() + " (оффер «" + submission.getOffer().getTitle() +
                            "»). Причина: " + safe(submission.getDisputeCategory()) + ".");
        }
    }

    private BigDecimal workerPayout(Submission submission) {
        long views = submission.getPayableViews() != null ? submission.getPayableViews()
                : (submission.getRecordedViews() != null ? submission.getRecordedViews() : 0L);
        BigDecimal viewsInMillions = BigDecimal.valueOf(views).divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);
        return viewsInMillions.multiply(submission.getOffer().getWorkerCpmRate()).setScale(2, RoundingMode.HALF_UP);
    }

    private String safe(String s) {
        return s != null ? s : "—";
    }
}
