package com.platform.ugc.repository.offer;

import com.platform.ugc.model.offer.WorkerOfferAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkerOfferAssignmentRepository extends JpaRepository<WorkerOfferAssignment, Long> {

    Optional<WorkerOfferAssignment> findByWorkerIdAndOfferId(Long workerId, Long offerId);

    List<WorkerOfferAssignment> findAllByWorkerIdAndIsActiveTrue(Long workerId);

    // Pagination initiative — Worker Workbench "Мои офферы" tab (GET /offers/my).
    Page<WorkerOfferAssignment> findAllByWorkerIdAndIsActiveTrue(Long workerId, Pageable pageable);

    boolean existsByWorkerIdAndOfferIdAndIsActiveTrue(Long workerId, Long offerId);

    long countByOfferIdAndIsActiveTrue(Long offerId);

    // Advertiser Cabinet's Campaign Detail Hub: the roster of workers currently on an offer.
    List<WorkerOfferAssignment> findAllByOfferIdAndIsActiveTrue(Long offerId);
}
