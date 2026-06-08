package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PurchaseReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

/** Repository for purchase receipt line items and received quantity calculations. */
public interface PurchaseReceiptItemRepository extends JpaRepository<PurchaseReceiptItem, Long> {
    /** Returns the already confirmed quantity for a purchase-order item. */
    @Query("""
            select coalesce(sum(item.quantityReceived), 0)
            from PurchaseReceiptItem item
            join item.purchaseReceipt receipt
            where item.purchaseOrderItem.id = :purchaseOrderItemId
              and receipt.status = com.dietetica.lembas.suppliers.model.PurchaseReceiptStatus.CONFIRMED
            """)
    BigDecimal sumConfirmedQuantityByPurchaseOrderItemId(@Param("purchaseOrderItemId") Long purchaseOrderItemId);
}
