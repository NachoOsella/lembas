package com.dietetica.lembas.suppliers.model;

import com.dietetica.lembas.catalog.model.Product;
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
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** One preview row inside a supplier price and catalog update batch. */
@Entity
@Table(
        name = "price_update_batch_items",
        indexes = {
                @Index(name = "idx_price_update_batch_items_batch", columnList = "batch_id"),
                @Index(name = "idx_price_update_batch_items_product", columnList = "product_id"),
                @Index(name = "idx_price_update_batch_items_supplier_product", columnList = "supplier_product_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class PriceUpdateBatchItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Parent batch that controls defaults and lifecycle. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private PriceUpdateBatch batch;

    /** Matched product-supplier association for existing product updates. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_product_id")
    private SupplierProduct supplierProduct;

    /** Matched existing product or product created when applying a CREATE row. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "supplier_sku", length = 100)
    private String supplierSku;

    @Column(name = "supplier_product_name", length = 255)
    private String supplierProductName;

    @Column(length = 100)
    private String barcode;

    @Column(name = "old_cost", precision = 12, scale = 2)
    private BigDecimal oldCost;

    @Column(name = "new_cost", precision = 12, scale = 2)
    private BigDecimal newCost;

    @Column(name = "supplier_variation_percentage", precision = 8, scale = 3)
    private BigDecimal supplierVariationPercentage;

    @Column(name = "transfer_percentage", precision = 8, scale = 3)
    private BigDecimal transferPercentage;

    @Column(name = "new_product_margin_percentage", precision = 5, scale = 2)
    private BigDecimal newProductMarginPercentage;

    @Column(name = "old_sale_price", precision = 12, scale = 2)
    private BigDecimal oldSalePrice;

    @Column(name = "suggested_sale_price", precision = 12, scale = 2)
    private BigDecimal suggestedSalePrice;

    @Column(name = "final_sale_price", precision = 12, scale = 2)
    private BigDecimal finalSalePrice;

    @Column(name = "apply_cost_update", nullable = false)
    private boolean applyCostUpdate = true;

    @Column(name = "apply_sale_price_update", nullable = false)
    private boolean applySalePriceUpdate = true;

    @Column(name = "create_product", nullable = false)
    private boolean createProduct;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PriceUpdateBatchItemStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

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
