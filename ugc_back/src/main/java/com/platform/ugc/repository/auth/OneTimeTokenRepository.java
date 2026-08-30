package com.platform.ugc.repository.auth;

import com.platform.ugc.model.auth.OneTimeToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface OneTimeTokenRepository extends JpaRepository<OneTimeToken, Long> {
    Optional<OneTimeToken> findByTokenAndPurpose(String token, OneTimeToken.Purpose purpose);

    // Invalidates any earlier unused tokens of the same purpose for a user before issuing a new
    // one, so re-requesting (e.g. clicking "forgot password" twice) can't leave two valid tokens
    // alive at once. Takes "now" as a bound parameter (an Instant, matching the entity's
    // usedAt/expiresAt column type exactly) rather than JPQL's CURRENT_TIMESTAMP, which maps to
    // java.sql.Timestamp and isn't guaranteed to coerce cleanly into an Instant-typed column
    // across Hibernate versions.
    @Modifying
    @Query("UPDATE OneTimeToken t SET t.usedAt = :now " +
            "WHERE t.user.id = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    void invalidateAllUnused(@Param("userId") Long userId, @Param("purpose") OneTimeToken.Purpose purpose, @Param("now") Instant now);
}
