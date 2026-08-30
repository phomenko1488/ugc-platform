package com.platform.ugc.service.payout;

import com.platform.ugc.dto.common.PageResponseDTO;
import com.platform.ugc.dto.payout.PayoutResponseDTO;
import com.platform.ugc.model.payout.Payout;

import java.math.BigDecimal;

/**
 * Payout lifecycle: creation (Worker/Partner Wallet "Заказать выплату") through to the Admin
 * Back-Office Payout Desk's process/complete/reject actions. Kept as its own service rather than
 * folded into AdminServiceImpl since a payout can be *created* by any authenticated user, not
 * just admins — {@link com.platform.ugc.controller.payout.PayoutController} and
 * {@link com.platform.ugc.controller.admin.AdminController} both depend on it.
 */
public interface PayoutService {

    PayoutResponseDTO requestPayout(Long userId, BigDecimal amount, String trc20Wallet);

    PageResponseDTO<PayoutResponseDTO> getPayoutsForUser(Long userId, int page, int size);

    PageResponseDTO<PayoutResponseDTO> getAllPayouts(Payout.Status status, int page, int size);

    PayoutResponseDTO process(Long payoutId);

    PayoutResponseDTO complete(Long payoutId, String txHash);

    PayoutResponseDTO reject(Long payoutId, String comment);
}
