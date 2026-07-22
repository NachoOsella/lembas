package com.dietetica.lembas.cash.repository;

import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repository for {@link CashSession} aggregates. */
public interface CashSessionRepository extends JpaRepository<CashSession, Long> {

    /** Returns true when a session with the given status already exists for the branch. */
    boolean existsByBranchIdAndStatus(Long branchId, CashSessionStatus status);

    /** Finds the open session for a branch, if any. Used by the open (conflict) and current endpoints. */
    Optional<CashSession> findFirstByBranchIdAndStatusOrderByOpenedAtDesc(Long branchId, CashSessionStatus status);

    /** Locks a session so close and cash-producing operations are serialized until transaction completion. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from CashSession session where session.id = :id")
    Optional<CashSession> findByIdForUpdate(@Param("id") Long id);

    /** Locks the unique open session for a branch for the complete POS sale transaction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            """
            select session from CashSession session
            where session.branch.id = :branchId
              and session.status = :status
            """)
    Optional<CashSession> findOpenByBranchIdForUpdate(
            @Param("branchId") Long branchId, @Param("status") CashSessionStatus status);
}
