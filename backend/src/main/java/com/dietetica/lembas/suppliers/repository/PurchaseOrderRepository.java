package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Repository for supplier purchase orders. */
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    /** Finds a purchase order with all data needed for detail, transitions, and PDF generation. */
    @EntityGraph(attributePaths = {"supplier", "branch", "items", "items.product", "items.supplierProduct"})
    @Query("select po from PurchaseOrder po where po.id = :id")
    Optional<PurchaseOrder> findWithItemsById(@Param("id") Long id);

    /** Lists purchase orders filtered by supplier, branch, and status. */
    @EntityGraph(attributePaths = {"supplier", "branch", "items"})
    @Query("""
            select po from PurchaseOrder po
            join po.supplier s
            join po.branch b
            where (:supplierId is null or s.id = :supplierId)
              and (:branchId is null or b.id = :branchId)
              and (:status is null or po.status = :status)
            """)
    Page<PurchaseOrder> search(
            @Param("supplierId") Long supplierId,
            @Param("branchId") Long branchId,
            @Param("status") PurchaseOrderStatus status,
            Pageable pageable
    );
}
