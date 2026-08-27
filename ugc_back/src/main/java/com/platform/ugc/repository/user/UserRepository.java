package com.platform.ugc.repository.user;

import com.platform.ugc.model.user.Role;
import com.platform.ugc.model.user.User;
import jakarta.persistence.LockModeType;
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
}