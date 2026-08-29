package com.platform.ugc.model.offer;

import com.platform.ugc.model.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * "Взять оффер в работу" — a worker's claim on an offer. This is what puts an offer on the
 * worker's personal Workbench ("Мои офферы в работе") instead of the shared catalog only.
 * <p>
 * History is preserved on purpose: leaving an offer flips {@link #isActive} to false rather than
 * deleting the row, so a worker's past submissions against that offer stay attributable even
 * after they drop it (and re-taking the same offer later just reactivates the same row, per the
 * unique (worker_id, offer_id) constraint below).
 */
@Entity
@Table(
        name = "worker_offer_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uk_worker_offer", columnNames = {"worker_id", "offer_id"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerOfferAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    private User worker;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offer_id", nullable = false)
    private Offer offer;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}
