package com.dietetica.lembas.inventory.model;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.branch.model.Branch;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Inventory lot for a product in a branch, optionally tied to an expiration date. */
@Entity
@Table(
        name = "stock_lots",
        indexes = {
            @Index(name = "idx_stock_lots_product_id", columnList = "product_id"),
            @Index(name = "idx_stock_lots_branch_id", columnList = "branch_id"),
            @Index(name = "idx_stock_lots_expiration_date", columnList = "expiration_date")
        })
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class StockLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Product whose units are available in this lot. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Branch that owns the lot. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** Quantity originally received in the lot. */
    @Column(name = "initial_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal initialQuantity = BigDecimal.ZERO;

    /** Current available quantity. This value is the source of truth for stock. */
    @Column(name = "quantity_available", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAvailable = BigDecimal.ZERO;

    /** Optional supplier id kept as a scalar until the suppliers module is implemented. */
    @Column(name = "supplier_id")
    private Long supplierId;

    /** Optional supplier-product id kept as a scalar until the suppliers module is implemented. */
    @Column(name = "supplier_product_id")
    private Long supplierProductId;

    /** Optional purchase receipt id kept as a scalar until the purchasing model is implemented. */
    @Column(name = "purchase_receipt_id")
    private Long purchaseReceiptId;

    /** Optional purchase receipt item id kept as a scalar until the purchasing model is implemented. */
    @Column(name = "purchase_receipt_item_id")
    private Long purchaseReceiptItemId;

    /** Optional supplier lot code used for traceability. */
    @Column(name = "lot_code", length = 100)
    private String lotCode;

    /** Optional expiration date used by FEFO ordering. Null dates are consumed last. */
    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    /** Legacy acquisition cost kept for compatibility while older stock entries are migrated. */
    @Column(name = "cost_price", precision = 12, scale = 2)
    private BigDecimal costPrice;

    /** Real received unit cost frozen at lot creation time. */
    @Column(name = "unit_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;

    /** Current lifecycle status used by availability and FEFO queries. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StockLotStatus status = StockLotStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Initializes audit timestamps before first persistence. */
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    /** Refreshes the update timestamp on each mutation. */
    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
