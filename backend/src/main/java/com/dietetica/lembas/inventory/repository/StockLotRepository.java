package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.model.StockLot;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Repository for stock lot availability and FEFO queries. */
public interface StockLotRepository extends JpaRepository<StockLot, Long> {

    /** Calculates available stock from lots, the single source of truth. */
    @Query("""
            select coalesce(sum(l.quantityAvailable), 0)
            from StockLot l
            where l.product.id = :productId
              and l.branch.id = :branchId
            """)
    BigDecimal calculateAvailableQuantity(
            @Param("productId") Long productId,
            @Param("branchId") Long branchId
    );

    /** Lists positive-quantity lots in FEFO order and locks them for safe deduction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select l from StockLot l
            where l.product.id = :productId
              and l.branch.id = :branchId
              and l.quantityAvailable > 0
            order by case when l.expirationDate is null then 1 else 0 end,
                     l.expirationDate asc,
                     l.id asc
            """)
    List<StockLot> findAvailableLotsForUpdate(
            @Param("productId") Long productId,
            @Param("branchId") Long branchId
    );

    /** Returns admin stock lots with optional product, branch, and expiring-soon filters. */
    @EntityGraph(attributePaths = {"product", "branch"})
    @Query("""
            select l from StockLot l
            join l.product p
            join l.branch b
            where (:productId is null or p.id = :productId)
              and (:branchId is null or b.id = :branchId)
              and (
                    :expiringSoon = false
                    or (l.expirationDate is not null
                        and l.expirationDate <= :expiringSoonLimit
                        and l.quantityAvailable > 0)
              )
            """)
    Page<StockLot> searchLots(
            @Param("productId") Long productId,
            @Param("branchId") Long branchId,
            @Param("expiringSoon") boolean expiringSoon,
            @Param("expiringSoonLimit") LocalDate expiringSoonLimit,
            Pageable pageable
    );
}
