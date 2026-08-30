package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.GeoCountry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface GeoCountryRepository extends JpaRepository<GeoCountry, Long> {
    Optional<GeoCountry> findByIsoCode(String isoCode);
    Set<GeoCountry> findAllByIdIn(Set<Long> ids);

    // Same "only what's enabled" convention PlatformRepository.findAllByIsEnabledTrue() already
    // uses — the Offer Wizard's GEO picker (public /api/v1/reference/geos) should stop offering a
    // country the admin just disabled from AdminReferencePage.
    List<GeoCountry> findAllByIsEnabledTrue();
}