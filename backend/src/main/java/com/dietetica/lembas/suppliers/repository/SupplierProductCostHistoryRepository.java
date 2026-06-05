package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.SupplierProductCostHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for supplier replacement cost history rows. */
public interface SupplierProductCostHistoryRepository extends JpaRepository<SupplierProductCostHistory, Long> {
    Page<SupplierProductCostHistory> findBySupplierProductIdOrderByValidFromDesc(Long supplierProductId, Pageable pageable);
}
