package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.Offer;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findAllByIsActiveTrue();
    List<Offer> findAllByAdvertiserId(Long advertiserId);

    // Pagination initiative — Advertiser Cabinet's campaign list (GET /offers/advertiser/{id}).
    // No OrderBy suffix: the caller's Pageable carries the sort (id desc).
    Page<Offer> findAllByAdvertiserId(Long advertiserId, Pageable pageable);

    // Pagination initiative — the Worker Workbench catalog (GET /offers/catalog), with optional
    // title search and platform-code narrowing. LEFT JOIN so offers with no platforms restriction
    // still match when :platform is null; the null-check short-circuits the p.code comparison
    // otherwise. Deliberately DISTINCT since the join can fan out one offer per matching platform row.
    @Query(value = "SELECT DISTINCT o FROM Offer o LEFT JOIN o.allowedPlatforms p " +
            "WHERE o.isActive = true " +
            "AND (:search IS NULL OR LOWER(o.title) LIKE CONCAT('%', :search, '%')) " +
            "AND (:platform IS NULL OR p.code = :platform)",
            countQuery = "SELECT COUNT(DISTINCT o) FROM Offer o LEFT JOIN o.allowedPlatforms p " +
            "WHERE o.isActive = true " +
            "AND (:search IS NULL OR LOWER(o.title) LIKE CONCAT('%', :search, '%')) " +
            "AND (:platform IS NULL OR p.code = :platform)")
    Page<Offer> findActiveCatalog(@Param("search") String search, @Param("platform") String platform, Pageable pageable);

    // Partner Cabinet — one query for every offer across all of a partner's referred advertisers,
    // instead of one findAllByAdvertiserId() call per advertiser.
    List<Offer> findAllByAdvertiserIdIn(Collection<Long> advertiserIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Offer o WHERE o.id = :id")
    Optional<Offer> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT DISTINCT o FROM Offer o " +
            "LEFT JOIN FETCH o.allowedPlatforms " +
            "LEFT JOIN FETCH o.targetGeos " +
            "WHERE o.isActive = true AND o.remainingBudget >= (o.workerCpmRate * o.minViewsThreshold / 1000000)")
    List<Offer> findActiveOffersWithBudget();
}