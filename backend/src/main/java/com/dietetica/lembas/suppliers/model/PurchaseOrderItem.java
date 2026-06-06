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
import java.time.OffsetDateTime;

/** Product, quantity, and expected cost snapshot in a supplier purchase order. */
@Entity
@Table(
        name = "purchase_order_items",
        indexes = {
                @Index(name = "idx_purchase_order_items_order_id", columnList = "purchase_order_id"),
                @Index(name = "idx_purchase_order_items_supplier_product_id", columnList = "supplier_product_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class PurchaseOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Parent purchase order. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    /** Catalog product expected from the supplier. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Supplier-product association used to preload the replacement cost. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_product_id")
    private SupplierProduct supplierProduct;

    @Column(name = "quantity_ordered", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityOrdered;

    @Column(name = "unit_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Initializes the immutable creation timestamp. */
    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
