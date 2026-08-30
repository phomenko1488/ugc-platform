package com.platform.ugc.repository.payout;

import com.platform.ugc.model.payout.Payout;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, Long> {
    List<Payout> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<Payout> findAllByStatusOrderByCreatedAtDesc(Payout.Status status);

    List<Payout> findAllByOrderByCreatedAtDesc();

    // Pagination initiative — Worker/Partner Wallet payout history and the Admin Payout Desk.
    // No OrderBy suffix: the caller's Pageable carries its own Sort (createdAt desc).
    Page<Payout> findAllByUserId(Long userId, Pageable pageable);

    Page<Payout> findAllByStatus(Payout.Status status, Pageable pageable);

    long countByStatus(Payout.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payout p WHERE p.id = :id")
    Optional<Payout> findByIdWithLock(@Param("id") Long id);
}
