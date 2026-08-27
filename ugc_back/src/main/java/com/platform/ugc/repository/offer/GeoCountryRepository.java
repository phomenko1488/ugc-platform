package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.GeoCountry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface GeoCountryRepository extends JpaRepository<GeoCountry, Long> {
    Optional<GeoCountry> findByIsoCode(String isoCode);
    Set<GeoCountry> findAllByIdIn(Set<Long> ids);
}