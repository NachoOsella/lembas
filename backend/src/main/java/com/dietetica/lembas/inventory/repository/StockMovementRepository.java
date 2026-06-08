package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;

import java.util.List;

/** Repository for append-only stock movement trace entries. */
public interface StockMovementRepository extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    /** Finds movements for a lot, used to verify purchase entry traceability. */
    List<StockMovement> findByStockLotId(Long stockLotId);

    /**
     * Applies the movement read graph to specification-based searches.
     *
     * <p>The inherited {@code findAll(spec, pageable)} method is redeclared so the
     * entity graph is applied while keeping dynamic predicates out of static JPQL.
     */
    @Override
    @EntityGraph(attributePaths = {"product", "branch", "stockLot"})
    Page<StockMovement> findAll(@Nullable Specification<StockMovement> specification, Pageable pageable);
}
