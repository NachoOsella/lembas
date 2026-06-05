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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Product offered by a supplier with its current replacement cost. */
@Entity
@Table(
        name = "supplier_products",
        uniqueConstraints = @UniqueConstraint(name = "uk_supplier_products_product_supplier", columnNames = {"product_id", "supplier_id"}),
        indexes = {
                @Index(name = "idx_supplier_products_product_id", columnList = "product_id"),
                @Index(name = "idx_supplier_products_supplier_id", columnList = "supplier_id"),
                @Index(name = "idx_supplier_products_active", columnList = "active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class SupplierProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Catalog product offered by the supplier. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Supplier that offers the product. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "supplier_sku", length = 100)
    private String supplierSku;

    @Column(name = "current_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentCost;

    @Column(name = "is_preferred", nullable = false)
    private boolean preferred;

    @Column(nullable = false)
    private boolean active = true;

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
