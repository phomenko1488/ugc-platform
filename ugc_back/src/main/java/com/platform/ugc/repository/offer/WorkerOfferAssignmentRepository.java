package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.WorkerOfferAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkerOfferAssignmentRepository extends JpaRepository<WorkerOfferAssignment, Long> {

    Optional<WorkerOfferAssignment> findByWorkerIdAndOfferId(Long workerId, Long offerId);

    List<WorkerOfferAssignment> findAllByWorkerIdAndIsActiveTrue(Long workerId);

    boolean existsByWorkerIdAndOfferIdAndIsActiveTrue(Long workerId, Long offerId);

    long countByOfferIdAndIsActiveTrue(Long offerId);

    // Advertiser Cabinet's Campaign Detail Hub: the roster of workers currently on an offer.
    List<WorkerOfferAssignment> findAllByOfferIdAndIsActiveTrue(Long offerId);
}
