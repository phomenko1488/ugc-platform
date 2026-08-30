package com.platform.ugc.email;

import com.platform.ugc.model.offer.Offer;
import com.platform.ugc.model.payout.Payout;
import com.platform.ugc.model.user.User;

/**
 * Transactional email — welcome on registration, password-reset links, payout confirmations and
 * low-budget alerts. Every method is safe to call unconditionally from the middle of a business
 * transaction: when {@code platform.mail.enabled=false} (the dev/CI default), nothing is actually
 * sent over SMTP — the rendered subject/body is logged to the console instead, so the flow is
 * visible and testable without a real mail relay configured. See {@link EmailServiceImpl}.
 */
public interface EmailService {

    void sendWelcomeEmail(User user);

    void sendPasswordResetEmail(User user, String resetToken);

    void sendPayoutCompletedEmail(User user, Payout payout);

    void sendLowBudgetAlert(User advertiser, Offer offer);
}
