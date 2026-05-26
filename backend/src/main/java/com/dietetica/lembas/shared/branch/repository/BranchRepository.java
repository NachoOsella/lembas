package com.dietetica.lembas.shared.branch.repository;

import com.dietetica.lembas.shared.branch.model.Branch;
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
}
