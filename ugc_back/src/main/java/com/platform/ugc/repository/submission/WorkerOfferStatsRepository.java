package com.platform.ugc.repository.submission;

import com.platform.ugc.model.submission.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Additive, read-only sibling of the real {@code SubmissionRepository} (which lives too deep in
 * the tree for this delivery's tools to read/patch safely — see INTEGRATION_GUIDE.md). Spring
 * Data JPA happily supports more than one repository interface over the same entity, so this
 * coexists without touching the existing repository at all.
 * <p>
 * Deliberately just fetches the rows and lets {@code WorkerOfferService} aggregate them in Java
 * instead of doing the count/sum in JPQL — {@code Submission.status}'s real type (String vs. an
 * enum, and if an enum, under what name) couldn't be confirmed, and a JPQL literal compared
 * against an enum path is exactly the kind of thing that silently behaves differently across
 * Hibernate versions. Comparing {@code String.valueOf(submission.getStatus())} in Java works
 * identically either way.
 */
public interface WorkerOfferStatsRepository extends JpaRepository<Submission, Long> {

    List<Submission> findAllByWorkerIdAndOfferId(Long workerId, Long offerId);
}
