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
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Append-only trace entry for a stock change applied to a lot. */
@Entity
@Table(
        name = "stock_movements",
        indexes = {
                @Index(name = "idx_stock_movements_product_id", columnList = "product_id"),
                @Index(name = "idx_stock_movements_branch_id", columnList = "branch_id"),
                @Index(name = "idx_stock_movements_stock_lot_id", columnList = "stock_lot_id"),
                @Index(name = "idx_stock_movements_order_id", columnList = "order_id"),
                @Index(name = "idx_stock_movements_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Lot affected by this movement. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_lot_id", nullable = false)
    private StockLot stockLot;

    /** Denormalized product reference for fast movement filtering and immutable traceability. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Denormalized branch reference for fast movement filtering and immutable traceability. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StockMovementType type;

    /** Signed quantity changed by this movement. */
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    /** Optional order id for sale and cancellation traceability. */
    @Column(name = "order_id")
    private Long orderId;

    /** Unit cost snapshot at movement time for reports and traceability. */
    @Column(name = "unit_cost_snapshot", precision = 12, scale = 2)
    private BigDecimal unitCostSnapshot;

    /** Generic source entity type that caused the movement. */
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    /** Generic source entity id that caused the movement. */
    @Column(name = "reference_id")
    private Long referenceId;

    /** User id that registered the movement when available. */
    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    /** Optional human-readable reason for adjustments and waste. */
    @Column(length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Initializes the immutable creation timestamp. */
    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
