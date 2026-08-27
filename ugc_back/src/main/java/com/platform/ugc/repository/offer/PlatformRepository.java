package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.PlatformEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PlatformRepository extends JpaRepository<PlatformEntity, Long> {
    Optional<PlatformEntity> findByCode(String code);
    List<PlatformEntity> findAllByIsEnabledTrue();
    Set<PlatformEntity> findAllByIdIn(Set<Long> ids);
}