package com.platform.ugc.repository.user;

import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
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
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByTelegramId(Long telegramId);
    Optional<User> findByEmail(String email);
    Optional<User> findByAffiliateTag(String affiliateTag);
    boolean existsByTelegramId(Long telegramId);
    boolean existsByEmail(String email);
    boolean existsByAffiliateTag(String affiliateTag);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT u FROM User u WHERE :role MEMBER OF u.roles")
    List<User> findAllByRole(@Param("role") Role role);

    @Query("SELECT u FROM User u WHERE u.b2cReferrer.id = :referrerId")
    List<User> findReferralsByWorkerReferrerId(@Param("referrerId") Long referrerId);

    @Query("SELECT u FROM User u WHERE u.b2bPartner.id = :partnerId")
    List<User> findAdvertisersByPartnerId(@Param("partnerId") Long partnerId);

    // Same result as findAdvertisersByPartnerId above (kept for the existing /referrals endpoint)
    // — this derived-name variant is what PartnerAnalyticsService uses, per the Partner Module ТЗ's
    // own naming.
    List<User> findAllByB2bPartnerId(Long partnerId);

    // Admin Back-Office — paginated user CRM listing (GET /api/v1/admin/users), optionally
    // narrowed by role and a case-insensitive substring search across username/email/affiliate
    // tag. Plain @Query + countQuery rather than JpaSpecificationExecutor/Specification: this
    // repository doesn't extend that interface today and this delivery can't compile to verify a
    // Criteria API + Pageable count-query interaction, so the lower-risk, already-precedented JPQL
    // null-safe-filter pattern is used instead (same shape as SubmissionRepository's traffic/
    // worker-submissions queries added alongside this one). Deliberately has no ORDER BY of its
    // own — the Pageable's embedded Sort supplies it.
    @Query(value = "SELECT DISTINCT u FROM User u WHERE (:role IS NULL OR :role MEMBER OF u.roles) " +
            "AND (:search IS NULL " +
            "OR LOWER(u.username) LIKE CONCAT('%', :search, '%') " +
            "OR LOWER(u.email) LIKE CONCAT('%', :search, '%') " +
            "OR LOWER(u.affiliateTag) LIKE CONCAT('%', :search, '%'))",
            countQuery = "SELECT COUNT(DISTINCT u) FROM User u WHERE (:role IS NULL OR :role MEMBER OF u.roles) " +
            "AND (:search IS NULL " +
            "OR LOWER(u.username) LIKE CONCAT('%', :search, '%') " +
            "OR LOWER(u.email) LIKE CONCAT('%', :search, '%') " +
            "OR LOWER(u.affiliateTag) LIKE CONCAT('%', :search, '%'))")
    Page<User> searchUsers(@Param("role") Role role, @Param("search") String search, Pageable pageable);
}