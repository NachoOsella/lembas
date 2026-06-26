package com.dietetica.lembas.cash.repository;

import com.dietetica.lembas.cash.model.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repository for {@link CashMovement} aggregates. */
public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {

    /** Returns all movements for a session ordered by creation time (oldest first). */
    List<CashMovement> findByCashSessionIdOrderByCreatedAtAsc(Long cashSessionId);
}