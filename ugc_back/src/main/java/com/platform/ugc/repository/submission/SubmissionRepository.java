package com.platform.ugc.repository.submission;

import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.submission.Submission;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    boolean existsByPlatformAndExternalVideoId(PlatformEntity platform, String externalVideoId);

    // HoldSettlementScheduler's every-minute sweep: every TRACKING submission whose hold window
    // has passed, ready for auto-settlement.
    List<Submission> findAllByStatusAndHoldExpiresAtLessThanEqual(Submission.Status status, Instant threshold);

    long countByWorkerIdAndStatus(Long workerId, Submission.Status status);

    List<Submission> findAllByWorkerIdOrderByCreatedAtDesc(Long workerId);

    List<Submission> findAllByOfferIdOrderByCreatedAtDesc(Long offerId);

    List<Submission> findAllByStatusOrderByCreatedAtAsc(Submission.Status status);

    // Метод для выборки обычной проверки + активных споров
    List<Submission> findAllByStatusInOrderByCreatedAtAsc(Collection<Submission.Status> statuses);

    // Pagination initiative — Moderator queue (GET /moderation/queue), single-status tab. No
    // OrderBy suffix: the caller's Pageable carries the sort (createdAt asc, FIFO).
    Page<Submission> findAllByStatus(Submission.Status status, Pageable pageable);

    // Pagination initiative — Moderator queue's "Вся очередь" tab (PENDING_REVIEW + DISPUTED).
    Page<Submission> findAllByStatusIn(Collection<Submission.Status> statuses, Pageable pageable);

    List<Submission> findAllByOffer_AdvertiserIdOrderByCreatedAtDesc(Long advertiserId);

    // Partner Cabinet — every submission across all of a partner's referred advertisers in one
    // query, for the dashboard/CRM aggregations in PartnerAnalyticsServiceImpl.
    List<Submission> findAllByOffer_AdvertiserIdIn(Collection<Long> advertiserIds);

    // Admin Back-Office ban cascade — every submission of a worker still holding platform money
    // (PENDING_REVIEW/TRACKING/DISPUTED) when an admin bans them, so AdminServiceImpl can annul
    // each one via the existing SubmissionService.rejectSubmission (returns the hold to the
    // offer's budget) instead of letting it settle after the ban.
    List<Submission> findAllByWorkerIdAndStatusIn(Long workerId, Collection<Submission.Status> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Submission s WHERE s.id = :id")
    Optional<Submission> findByIdWithLock(@Param("id") Long id);

    // Pagination initiative — Advertiser Traffic Inspector (GET /api/v1/advertiser/{id}/traffic).
    // No ORDER BY of its own: the caller's Pageable carries the sort (createdAt desc).
    @Query(value = "SELECT s FROM Submission s WHERE s.offer.advertiser.id = :advertiserId " +
            "AND (:status IS NULL OR s.status = :status)",
            countQuery = "SELECT COUNT(s) FROM Submission s WHERE s.offer.advertiser.id = :advertiserId " +
            "AND (:status IS NULL OR s.status = :status)")
    Page<Submission> findAllByOfferAdvertiserId(@Param("advertiserId") Long advertiserId,
                                                 @Param("status") Submission.Status status,
                                                 Pageable pageable);

    // Pagination initiative — Worker Cabinet submissions list (GET /api/v1/submissions/worker/{id}),
    // optionally narrowed by status and/or a specific campaign (offer). Same no-own-ORDER-BY rule.
    @Query(value = "SELECT s FROM Submission s WHERE s.worker.id = :workerId " +
            "AND (:status IS NULL OR s.status = :status) " +
            "AND (:campaignId IS NULL OR s.offer.id = :campaignId)",
            countQuery = "SELECT COUNT(s) FROM Submission s WHERE s.worker.id = :workerId " +
            "AND (:status IS NULL OR s.status = :status) " +
            "AND (:campaignId IS NULL OR s.offer.id = :campaignId)")
    Page<Submission> findAllByWorkerId(@Param("workerId") Long workerId,
                                        @Param("status") Submission.Status status,
                                        @Param("campaignId") Long campaignId,
                                        Pageable pageable);
}