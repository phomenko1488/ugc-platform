package com.platform.ugc.repository.integration;

import com.platform.ugc.model.integration.ApiToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiTokenRepository extends JpaRepository<ApiToken, Long> {
    List<ApiToken> findAllByAdvertiserIdOrderByCreatedAtDesc(Long advertiserId);
    Optional<ApiToken> findByIdAndAdvertiserId(Long id, Long advertiserId);
    Optional<ApiToken> findByTokenHash(String tokenHash);
}
