package com.platform.ugc.service.finance;

import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.model.user.B2BPartnerTerms;
import com.platform.ugc.model.user.ReferralTerms;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import com.platform.ugc.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Component
@RequiredArgsConstructor
public class FinancialSettlementEngine {

    private final UserRepository userRepository;
    private final FinancialLedgerRepository ledgerRepository;

    @Transactional(propagation = Propagation.MANDATORY)
    public void executeSettlement(Submission submission) {
        Offer offer = submission.getOffer();
        User worker = submission.getWorker();
        User advertiser = offer.getAdvertiser();

        BigDecimal viewsInMillions = BigDecimal.valueOf(submission.getRecordedViews())
                .divide(BigDecimal.valueOf(1_000_000), 6, RoundingMode.HALF_UP);

        BigDecimal grossAdvertiserCost = viewsInMillions.multiply(offer.getAdvertiserCpmRate());
        BigDecimal workerPayout = viewsInMillions.multiply(offer.getWorkerCpmRate());
        BigDecimal platformGrossSpread = grossAdvertiserCost.subtract(workerPayout);

        BigDecimal b2cCommission = resolveB2CCommission(worker, workerPayout, viewsInMillions);
        BigDecimal b2bCommission = resolveB2BCommission(advertiser, platformGrossSpread, grossAdvertiserCost, viewsInMillions);
        BigDecimal platformNetProfit = platformGrossSpread.subtract(b2cCommission).subtract(b2bCommission);

        if (platformNetProfit.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Отрицательная чистая маржа платформы по заявке #" + submission.getId());
        }

        // 1. Начисление воркеру
        worker.setHoldBalance(worker.getHoldBalance().subtract(submission.getHoldAmount()));
        worker.setAvailableBalance(worker.getAvailableBalance().add(workerPayout));
        if (worker.getTrustLevel() == 1) {
            worker.setTrustLevel(2);
        }
        userRepository.save(worker);
        recordLedger(worker, submission, FinancialLedgerEntry.EntryType.WORKER_PAYOUT, workerPayout, "Выплата за видео #" + submission.getExternalVideoId());

        // 2. Начисление B2C рефереру
        if (worker.getB2cReferrer() != null && b2cCommission.compareTo(BigDecimal.ZERO) > 0) {
            User referrer = worker.getB2cReferrer();
            referrer.setReferralEarnedTotal(referrer.getReferralEarnedTotal().add(b2cCommission));
            referrer.setAvailableBalance(referrer.getAvailableBalance().add(b2cCommission));
            userRepository.save(referrer);
            recordLedger(referrer, submission, FinancialLedgerEntry.EntryType.B2C_REFERRAL_COMMISSION, b2cCommission, "B2C Реферальный бонус");
        }

        // 3. Начисление B2B агенту
        if (advertiser.getB2bPartner() != null && b2bCommission.compareTo(BigDecimal.ZERO) > 0) {
            User partner = advertiser.getB2bPartner();
            partner.setReferralEarnedTotal(partner.getReferralEarnedTotal().add(b2bCommission));
            partner.setAvailableBalance(partner.getAvailableBalance().add(b2bCommission));
            userRepository.save(partner);
            recordLedger(partner, submission, FinancialLedgerEntry.EntryType.B2B_PARTNER_COMMISSION, b2bCommission, "B2B Комиссия за рекламодателя");
        }

        log.info("Клиринг заявки [ID: {}] завершен. Gross: ${}, Worker: ${}, Margin: ${}",
                submission.getId(), grossAdvertiserCost, workerPayout, platformNetProfit);
    }

    private BigDecimal resolveB2CCommission(User worker, BigDecimal workerPayout, BigDecimal volumeMillions) {
        User referrer = worker.getB2cReferrer();
        if (referrer == null || Boolean.TRUE.equals(referrer.getIsBanned())) {
            return BigDecimal.ZERO;
        }

        ReferralTerms terms = referrer.getB2cReferralTerms();
        return switch (terms.getRewardType()) {
            case PERCENTAGE_OF_PAYOUT -> workerPayout.multiply(terms.getRate())
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            case FIXED_PER_MILLION -> volumeMillions.multiply(terms.getRate());
            case TIERED_VOLUME -> volumeMillions.multiply(new BigDecimal("5.00"));
        };
    }

    private BigDecimal resolveB2BCommission(User advertiser, BigDecimal spread, BigDecimal gross, BigDecimal volumeMillions) {
        User partner = advertiser.getB2bPartner();
        if (partner == null || Boolean.TRUE.equals(partner.getIsBanned())) {
            return BigDecimal.ZERO;
        }

        B2BPartnerTerms terms = partner.getB2bPartnerTerms();
        if (!Boolean.TRUE.equals(terms.getIsActive())) {
            return BigDecimal.ZERO;
        }

        return switch (terms.getCommissionType()) {
            case PERCENT_OF_PLATFORM_MARGIN -> spread.multiply(terms.getCommissionRate())
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            case PERCENT_OF_GROSS_TURNOVER -> gross.multiply(terms.getCommissionRate())
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            case FIXED_PER_QUALIFIED_MILLION -> volumeMillions.multiply(terms.getCommissionRate());
        };
    }

    private void recordLedger(User user, Submission submission, FinancialLedgerEntry.EntryType type, BigDecimal amount, String desc) {
        ledgerRepository.save(FinancialLedgerEntry.builder()
                .user(user)
                .submission(submission)
                .offer(submission != null ? submission.getOffer() : null)
                .recordedViews(submission != null ? submission.getRecordedViews() : null)
                .entryType(type)
                .amount(amount)
                .description(desc)
                .build());
    }
}