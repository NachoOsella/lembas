package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for append-only stock movement trace entries. */
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
}
