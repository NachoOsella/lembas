package com.dietetica.lembas.suppliers.model;

import com.dietetica.lembas.catalog.model.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Real received quantity for one product in a purchase receipt. */
@Entity
@Table(
        name = "purchase_receipt_items",
        indexes = {
                @Index(name = "idx_purchase_receipt_items_receipt_id", columnList = "purchase_receipt_id"),
                @Index(name = "idx_purchase_receipt_items_order_item_id", columnList = "purchase_order_item_id"),
                @Index(name = "idx_purchase_receipt_items_product_id", columnList = "product_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class PurchaseReceiptItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Parent receipt. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_receipt_id", nullable = false)
    private PurchaseReceipt purchaseReceipt;

    /** Expected purchase-order item being fulfilled. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id")
    private PurchaseOrderItem purchaseOrderItem;

    /** Product received. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Supplier-product association used for cost traceability. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_product_id")
    private SupplierProduct supplierProduct;

    @Column(name = "quantity_received", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityReceived;

    @Column(name = "unit_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "lot_code", length = 100)
    private String lotCode;

    @Column(name = "created_stock_lot_id")
    private Long createdStockLotId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Initializes creation timestamp before persistence. */
    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
