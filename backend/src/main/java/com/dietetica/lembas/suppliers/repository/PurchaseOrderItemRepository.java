package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for purchase order items. */
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {
}
