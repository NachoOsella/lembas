package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

/** Repository for append-only stock movement trace entries. */
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /** Finds movements for a lot, used to verify purchase entry traceability. */
    List<StockMovement> findByStockLotId(Long stockLotId);

    /**
     * Paginated search across stock movements with optional filters.
     *
     * @param type      filter by movement type (optional)
     * @param productId filter by product (optional)
     * @param branchId  filter by branch (optional)
     * @param fromDate  lower bound for creation timestamp (optional)
     * @param toDate    upper bound for creation timestamp (optional)
     * @param pageable  pagination and sort
     * @return matching movements with eagerly fetched product and branch
     */
    @Query("""
            select m from StockMovement m
            join fetch m.product p
            join fetch m.branch b
            where (:type is null or m.type = :type)
              and (:productId is null or m.product.id = :productId)
              and (:branchId is null or m.branch.id = :branchId)
              and (:fromDate is null or m.createdAt >= :fromDate)
              and (:toDate is null or m.createdAt <= :toDate)
            """)
    Page<StockMovement> searchMovements(
            @Param("type") StockMovementType type,
            @Param("productId") Long productId,
            @Param("branchId") Long branchId,
            @Param("fromDate") OffsetDateTime fromDate,
            @Param("toDate") OffsetDateTime toDate,
            Pageable pageable
    );
}
