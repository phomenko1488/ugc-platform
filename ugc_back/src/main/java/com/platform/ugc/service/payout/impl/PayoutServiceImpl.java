package com.platform.ugc.service.payout.impl;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.email.EmailService;
import com.platform.ugc.model.finance.FinancialLedgerEntry;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.user.User;
import com.platform.ugc.repository.finance.FinancialLedgerRepository;
import com.platform.ugc.repository.payout.PayoutRepository;
import com.platform.ugc.repository.user.UserRepository;
import com.platform.ugc.service.payout.PayoutService;
import com.platform.ugc.telegram.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutServiceImpl implements PayoutService {

    // Same floor the Worker/Partner Wallet pages already enforce client-side — kept in sync here
    // so a payout can't be forced through by calling the API directly under this amount.
    private static final BigDecimal MIN_PAYOUT = new BigDecimal("20");

    private final PayoutRepository payoutRepository;
    private final UserRepository userRepository;
    private final FinancialLedgerRepository ledgerRepository;
    private final TelegramNotificationService telegramNotificationService;
    private final EmailService emailService;

    @Override
    @Transactional
    public PayoutResponseDTO requestPayout(Long userId, BigDecimal amount, String trc20Wallet) {
        User user = userRepository.findByIdWithLock(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));

        if (Boolean.TRUE.equals(user.getIsBanned())) {
            throw new IllegalStateException("Аккаунт заблокирован — вывод средств недоступен.");
        }
        if (trc20Wallet == null || trc20Wallet.isBlank()) {
            throw new IllegalArgumentException("Укажите адрес кошелька TRC-20.");
        }
        if (amount == null || amount.compareTo(MIN_PAYOUT) < 0) {
            throw new IllegalArgumentException("Минимальная сумма вывода — $" + MIN_PAYOUT.setScale(2) + ".");
        }
        if (amount.compareTo(user.getAvailableBalance()) > 0) {
            throw new IllegalStateException("Сумма превышает доступный баланс.");
        }

        user.setAvailableBalance(user.getAvailableBalance().subtract(amount));
        userRepository.save(user);

        Payout payout = payoutRepository.save(Payout.builder()
                .user(user)
                .amount(amount)
                .trc20Wallet(trc20Wallet.trim())
                .status(Payout.Status.PENDING)
                .build());

        log.info("Заявка на выплату #{} создана пользователем {} на сумму ${}", payout.getId(), userId, amount);
        return PayoutResponseDTO.fromEntity(payout);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PayoutResponseDTO> getPayoutsForUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Payout> payouts = payoutRepository.findAllByUserId(userId, pageable);
        return PageResponseDTO.of(payouts.map(PayoutResponseDTO::fromEntity));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<PayoutResponseDTO> getAllPayouts(Payout.Status status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Payout> payouts = status != null
                ? payoutRepository.findAllByStatus(status, pageable)
                : payoutRepository.findAll(pageable);
        return PageResponseDTO.of(payouts.map(PayoutResponseDTO::fromEntity));
    }

    @Override
    @Transactional
    public PayoutResponseDTO process(Long payoutId) {
        Payout payout = requireLocked(payoutId);
        if (payout.getStatus() != Payout.Status.PENDING) {
            throw new IllegalStateException("В обработку можно перевести только заявку в статусе PENDING.");
        }
        payout.setStatus(Payout.Status.PROCESSING);
        return PayoutResponseDTO.fromEntity(payoutRepository.save(payout));
    }

    @Override
    @Transactional
    public PayoutResponseDTO complete(Long payoutId, String txHash) {
        if (txHash == null || txHash.isBlank()) {
            throw new IllegalArgumentException("Укажите хэш транзакции (txHash) сети Tron.");
        }
        Payout payout = requireLocked(payoutId);
        if (payout.getStatus() == Payout.Status.COMPLETED) {
            return PayoutResponseDTO.fromEntity(payout); // Идемпотентность
        }
        if (payout.getStatus() == Payout.Status.REJECTED) {
            throw new IllegalStateException("Заявка уже отклонена — сначала создайте новую.");
        }

        payout.setStatus(Payout.Status.COMPLETED);
        payout.setTxHash(txHash.trim());
        payoutRepository.save(payout);

        ledgerRepository.save(FinancialLedgerEntry.builder()
                .user(payout.getUser())
                .entryType(FinancialLedgerEntry.EntryType.WORKER_WITHDRAWAL)
                .amount(payout.getAmount().negate())
                .description("Выплата USDT TRC-20 — заявка #" + payout.getId())
                .build());

        telegramNotificationService.notifyPayoutCompleted(payout.getUser(), payout.getAmount(), payout.getTxHash());
        emailService.sendPayoutCompletedEmail(payout.getUser(), payout);

        log.info("Выплата #{} подтверждена администратором, txHash={}", payoutId, txHash);
        return PayoutResponseDTO.fromEntity(payout);
    }

    @Override
    @Transactional
    public PayoutResponseDTO reject(Long payoutId, String comment) {
        Payout payout = requireLocked(payoutId);
        if (payout.getStatus() == Payout.Status.COMPLETED) {
            throw new IllegalStateException("Нельзя отклонить уже выполненную выплату.");
        }
        if (payout.getStatus() == Payout.Status.REJECTED) {
            return PayoutResponseDTO.fromEntity(payout); // Идемпотентность
        }

        User user = userRepository.findByIdWithLock(payout.getUser().getId())
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + payout.getUser().getId()));
        user.setAvailableBalance(user.getAvailableBalance().add(payout.getAmount()));
        userRepository.save(user);

        payout.setStatus(Payout.Status.REJECTED);
        payout.setComment(comment);
        payoutRepository.save(payout);

        log.info("Выплата #{} отклонена администратором, ${} возвращены на баланс пользователя {}",
                payoutId, payout.getAmount(), user.getId());
        return PayoutResponseDTO.fromEntity(payout);
    }

    private Payout requireLocked(Long payoutId) {
        return payoutRepository.findByIdWithLock(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Заявка на выплату не найдена: " + payoutId));
    }
}
