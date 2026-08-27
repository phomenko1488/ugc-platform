package com.platform.ugc.repository.submission;

import com.platform.ugc.model.offer.PlatformEntity;
import com.platform.ugc.model.submission.Submission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    boolean existsByPlatformAndExternalVideoId(PlatformEntity platform, String externalVideoId);
    long countByWorkerIdAndStatus(Long workerId, Submission.Status status);
    List<Submission> findAllByWorkerIdOrderByCreatedAtDesc(Long workerId);
    List<Submission> findAllByOfferIdOrderByCreatedAtDesc(Long offerId);
    List<Submission> findAllByStatusOrderByCreatedAtAsc(Submission.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Submission s WHERE s.id = :id")
    Optional<Submission> findByIdWithLock(@Param("id") Long id);
}