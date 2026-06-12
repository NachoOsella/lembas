package com.dietetica.lembas.orders.model;

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

/**
 * Line item for an order with immutable product and price snapshots.
 *
 * <p>Snapshots are intentionally duplicated here so historical reports and
 * cancellations remain accurate even if catalog data changes later.</p>
 */
@Entity
@Table(
        name = "order_items",
        indexes = {
                @Index(name = "idx_order_items_order_id", columnList = "order_id"),
                @Index(name = "idx_order_items_product_id", columnList = "product_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Parent order. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Catalog product. May be null for items referencing a since-deleted product. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    /** Sold quantity. Fractional values are allowed. */
    @Column(nullable = false, precision = 12, scale = 3)
    @ToString.Include
    private BigDecimal quantity;

    /** Unit price charged to the customer. */
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    @ToString.Include
    private BigDecimal unitPrice;

    /** Per-line discount. */
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    /** Computed line total: quantity * unit_price - discount_amount. */
    @Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
    @ToString.Include
    private BigDecimal subtotalAmount;

    /** Product name captured at sale time. */
    @Column(name = "product_name_snapshot", nullable = false, length = 255)
    private String productNameSnapshot;

    /** Product barcode captured at sale time (optional). */
    @Column(name = "product_barcode_snapshot", length = 100)
    private String productBarcodeSnapshot;

    /** Unit cost captured at sale time for margin reports. */
    @Column(name = "cost_price_snapshot", precision = 12, scale = 2)
    private BigDecimal costPriceSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Initializes the immutable creation timestamp and per-line defaults. */
    @PrePersist
    void onCreate() {
        if (discountAmount == null) {
            discountAmount = BigDecimal.ZERO;
        }
        createdAt = OffsetDateTime.now();
    }
}
