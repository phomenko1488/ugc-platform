package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.Offer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findAllByIsActiveTrue();
    List<Offer> findAllByAdvertiserId(Long advertiserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Offer o WHERE o.id = :id")
    Optional<Offer> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT DISTINCT o FROM Offer o " +
            "LEFT JOIN FETCH o.allowedPlatforms " +
            "LEFT JOIN FETCH o.targetGeos " +
            "WHERE o.isActive = true AND o.remainingBudget >= (o.workerCpmRate * o.minViewsThreshold / 1000000)")
    List<Offer> findActiveOffersWithBudget();
}