package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repository for append-only stock movement trace entries. */
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /** Finds movements for a lot, used to verify purchase entry traceability. */
    List<StockMovement> findByStockLotId(Long stockLotId);
}
