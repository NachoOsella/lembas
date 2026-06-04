package com.dietetica.lembas.inventory.model;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.branch.model.Branch;
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
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Inventory lot for a product in a branch, optionally tied to an expiration date. */
@Entity
@Table(
        name = "stock_lots",
        indexes = {
                @Index(name = "idx_stock_lots_product_id", columnList = "product_id"),
                @Index(name = "idx_stock_lots_branch_id", columnList = "branch_id"),
                @Index(name = "idx_stock_lots_expiration_date", columnList = "expiration_date")
        }
)
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

    /** Current available quantity. This value is the source of truth for stock. */
    @Column(name = "quantity_available", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAvailable = BigDecimal.ZERO;

    /** Optional supplier lot code used for traceability. */
    @Column(name = "lot_code", length = 100)
    private String lotCode;

    /** Optional expiration date used by FEFO ordering. Null dates are consumed last. */
    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    /** Optional acquisition cost for reporting and COGS calculations. */
    @Column(name = "cost_price", precision = 12, scale = 2)
    private BigDecimal costPrice;

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
