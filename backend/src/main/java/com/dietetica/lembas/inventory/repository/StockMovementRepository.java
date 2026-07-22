package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockMovement;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.Nullable;

/** Repository for append-only stock movement trace entries. */
public interface StockMovementRepository
        extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {

    /** Finds movements for a lot, used to verify purchase entry traceability. */
    List<StockMovement> findByStockLotId(Long stockLotId);

    /**
     * Finds all sale movements linked to an order, used to reverse stock on cancellation.
     *
     * <p>Returns the original ONLINE_SALE and POS_SALE movements that deducted stock for
     * the order, in id-ascending order. The {@code order_id} column is indexed via
     * {@code idx_stock_movements_order_id} for fast lookup.</p>
     */
    @EntityGraph(attributePaths = {"stockLot", "product", "branch"})
    @Query(
            """
            select m from StockMovement m
            where m.orderId = :orderId
              and m.type in (
                  com.dietetica.lembas.inventory.model.StockMovementType.ONLINE_SALE,
                  com.dietetica.lembas.inventory.model.StockMovementType.POS_SALE
              )
            order by m.id asc
            """)
    List<StockMovement> findSaleMovementsByOrderId(@Param("orderId") Long orderId);

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
