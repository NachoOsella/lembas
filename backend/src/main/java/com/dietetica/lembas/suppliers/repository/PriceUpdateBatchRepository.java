package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatch;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Repository for supplier price update batches. */
public interface PriceUpdateBatchRepository extends JpaRepository<PriceUpdateBatch, Long> {
    /** Lists batches by optional supplier and status filters. */
    @EntityGraph(attributePaths = "supplier")
    @Query("""
            select b from PriceUpdateBatch b
            left join b.supplier s
            where (:supplierId is null or s.id = :supplierId)
              and (:status is null or b.status = :status)
            """)
    Page<PriceUpdateBatch> search(
            @Param("supplierId") Long supplierId,
            @Param("status") PriceUpdateBatchStatus status,
            Pageable pageable
    );

    /** Loads one batch with supplier and items for detail responses. */
    @EntityGraph(attributePaths = {"supplier", "items", "items.product", "items.supplierProduct", "items.supplierProduct.product"})
    Optional<PriceUpdateBatch> findDetailedById(Long id);

    /** Locks a batch before mutating lifecycle-sensitive state. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"supplier", "items", "items.product", "items.supplierProduct", "items.supplierProduct.product"})
    @Query("select b from PriceUpdateBatch b where b.id = :id")
    Optional<PriceUpdateBatch> findDetailedByIdForUpdate(@Param("id") Long id);
}
