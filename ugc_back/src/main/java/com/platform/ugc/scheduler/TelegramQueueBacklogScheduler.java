package com.platform.ugc.scheduler;

import com.platform.ugc.model.submission.Submission;
import com.platform.ugc.repository.submission.SubmissionRepository;
import com.platform.ugc.telegram.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Periodic moderation-queue-backlog watch — pings moderators/admins on Telegram once the
 * PENDING_REVIEW + DISPUTED queue crosses {@link #BACKLOG_THRESHOLD}. Deliberately simple (no
 * persisted "already alerted" marker, so it may re-fire on every sweep while the backlog stays
 * over the threshold): same accepted trade-off as the advertiser low-budget alert.
 */
@Component
@RequiredArgsConstructor
public class TelegramQueueBacklogScheduler {

    private static final int BACKLOG_THRESHOLD = 20;
    private static final List<Submission.Status> QUEUE_STATUSES =
            List.of(Submission.Status.PENDING_REVIEW, Submission.Status.DISPUTED);

    private final SubmissionRepository submissionRepository;
    private final TelegramNotificationService telegramNotificationService;

    @Scheduled(fixedDelayString = "${app.telegram.backlog-check-delay-ms:300000}")
    @Transactional(readOnly = true)
    public void checkBacklog() {
        long pendingCount = submissionRepository.countByStatusIn(QUEUE_STATUSES);
        if (pendingCount > BACKLOG_THRESHOLD) {
            telegramNotificationService.notifyQueueBacklogAlert((int) Math.min(pendingCount, Integer.MAX_VALUE));
        }
    }
}
