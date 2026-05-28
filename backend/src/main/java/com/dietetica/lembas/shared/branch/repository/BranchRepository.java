package com.dietetica.lembas.shared.branch.repository;

import com.dietetica.lembas.shared.branch.model.Branch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Repository for branch selector queries.
 */
public interface BranchRepository extends JpaRepository<Branch, Long> {

    /**
     * Finds all active branches ordered by name for deterministic dropdown display.
     *
     * @return active branches sorted by name
     */
    List<Branch> findByActiveTrueOrderByNameAsc();

    /**
     * Finds active branches with an explicit page-size cap to avoid unbounded selectors.
     *
     * @param pageable page request used only for size and ordering constraints
     * @return page of active branches sorted by name
     */
    Page<Branch> findByActiveTrueOrderByNameAsc(Pageable pageable);

    /**
     * Checks whether an active branch exists with the provided identifier.
     *
     * @param id branch identifier
     * @return true when the branch exists and is active
     */
    boolean existsByIdAndActiveTrue(Long id);
}
