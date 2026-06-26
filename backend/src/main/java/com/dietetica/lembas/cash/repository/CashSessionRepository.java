package com.dietetica.lembas.cash.repository;

import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Repository for {@link CashSession} aggregates. */
public interface CashSessionRepository extends JpaRepository<CashSession, Long> {

    /** Returns true when a session with the given status already exists for the branch. */
    boolean existsByBranchIdAndStatus(Long branchId, CashSessionStatus status);

    /** Finds the open session for a branch, if any. Used by the open (conflict) and current endpoints. */
    Optional<CashSession> findFirstByBranchIdAndStatusOrderByOpenedAtDesc(Long branchId, CashSessionStatus status);
}