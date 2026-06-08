package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.inventory.dto.StockProductSummaryDto;
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
import java.util.Optional;

/** Repository for stock lot availability and FEFO queries. */
public interface StockLotRepository extends JpaRepository<StockLot, Long> {

    /** Calculates available stock from lots, the single source of truth. */
    @Query("""
            select coalesce(sum(l.quantityAvailable), 0)
            from StockLot l
            where l.product.id = :productId
              and l.branch.id = :branchId
              and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
            """)
    BigDecimal calculateAvailableQuantity(
            @Param("productId") Long productId,
            @Param("branchId") Long branchId
    );

    /** Finds one lot and locks it for safe manual stock updates. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from StockLot l where l.id = :id")
    Optional<StockLot> findByIdForUpdate(@Param("id") Long id);

    /** Lists positive-quantity lots in FEFO order and locks them for safe deduction. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select l from StockLot l
            where l.product.id = :productId
              and l.branch.id = :branchId
              and l.quantityAvailable > 0
              and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
            order by case when l.expirationDate is null then 1 else 0 end,
                     l.expirationDate asc,
                     l.id asc
            """)
    List<StockLot> findAvailableLotsForUpdate(
            @Param("productId") Long productId,
            @Param("branchId") Long branchId
    );

    /** Returns aggregated stock summaries grouped by product and branch, with nearest expiration date. */
    @Query("""
            select new com.dietetica.lembas.inventory.dto.StockProductSummaryDto(
                p.id,
                p.name,
                b.id,
                b.name,
                coalesce(sum(l.quantityAvailable), 0),
                min(l.expirationDate),
                count(l)
            )
            from StockLot l
            join l.product p
            join l.branch b
            where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
              and (:searchPattern is null or p.name like :searchPattern)
              and (:branchId is null or b.id = :branchId)
              and (
                    :expiringSoon = false
                    or (l.expirationDate is not null
                        and l.expirationDate <= :expiringSoonLimit
                        and l.quantityAvailable > 0)
              )
            group by p.id, p.name, b.id, b.name
            """)
    Page<StockProductSummaryDto> searchProductSummaries(
            @Param("searchPattern") String searchPattern,
            @Param("branchId") Long branchId,
            @Param("expiringSoon") boolean expiringSoon,
            @Param("expiringSoonLimit") LocalDate expiringSoonLimit,
            Pageable pageable
    );

    /** Returns admin stock lots with optional product name search, branch, and expiring-soon filters. */
    @EntityGraph(attributePaths = {"product", "branch"})
    @Query("""
            select l from StockLot l
            join l.product p
            join l.branch b
            where (:searchPattern is null or p.name like :searchPattern)
              and (:productId is null or p.id = :productId)
              and (:branchId is null or b.id = :branchId)
              and (
                    :expiringSoon = false
                    or (l.expirationDate is not null
                        and l.expirationDate <= :expiringSoonLimit
                        and l.quantityAvailable > 0
                        and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE)
              )
            """)
    Page<StockLot> searchLots(
            @Param("searchPattern") String searchPattern,
            @Param("productId") Long productId,
            @Param("branchId") Long branchId,
            @Param("expiringSoon") boolean expiringSoon,
            @Param("expiringSoonLimit") LocalDate expiringSoonLimit,
            Pageable pageable
    );
}
