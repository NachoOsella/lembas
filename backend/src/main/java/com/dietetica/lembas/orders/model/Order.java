package com.dietetica.lembas.orders.model;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.users.model.User;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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
import java.util.ArrayList;
import java.util.List;

/**
 * Unified order for both POS and ONLINE sales.
 *
 * <p>The order aggregate owns its items: items are removed automatically when
 * the parent is deleted (cascade + orphan removal). Snapshots of customer
 * contact data and per-item product information keep historical reports stable
 * even when catalog or user data changes later.</p>
 */
@Entity
@Table(
        name = "orders",
        indexes = {
                @Index(name = "idx_orders_branch_created_at", columnList = "branch_id,created_at"),
                @Index(name = "idx_orders_status", columnList = "status"),
                @Index(name = "idx_orders_type", columnList = "type"),
                @Index(name = "idx_orders_customer_user_id", columnList = "customer_user_id"),
                @Index(name = "idx_orders_created_by_user_id", columnList = "created_by_user_id"),
                @Index(name = "idx_orders_status_type", columnList = "status,type"),
                @Index(name = "idx_orders_cash_session_id", columnList = "cash_session_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Human-readable unique identifier (e.g. {@code ON-20260612-000001}). */
    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    @ToString.Include
    private String orderNumber;

    /** Channel that created the order. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderType type;

    /** Current lifecycle state. POS orders are constrained to PAID or CANCELLED by the DB. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    /** Branch that owns the sale (POS) or that will hand the order over (ONLINE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** Registered customer for ONLINE orders. Nullable for POS. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_user_id")
    private User customerUser;

    /** Internal employee that created POS orders. Nullable for ONLINE. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    /**
     * Cash session (Sprint 3) the POS order was billed against. Nullable for
     * ONLINE orders. No foreign key at the DB level: cash sessions are
     * append-only history and must be archiveable without breaking historical
     * orders. The application layer validates the session is OPEN at sale
     * time (see {@code PosSaleService}).
     */
    @Column(name = "cash_session_id")
    private Long cashSessionId;

    /** Customer name captured at order time. */
    @Column(name = "customer_name_snapshot", length = 255)
    private String customerNameSnapshot;

    /** Customer email captured at order time. */
    @Column(name = "customer_email_snapshot", length = 255)
    private String customerEmailSnapshot;

    /** Customer phone captured at order time. */
    @Column(name = "customer_phone_snapshot", length = 50)
    private String customerPhoneSnapshot;

    /** Fulfillment mode. MVP only supports PICKUP. */
    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", nullable = false, length = 20)
    private FulfillmentType fulfillmentType = FulfillmentType.PICKUP;

    /** Sum of line subtotals before discounts. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    /** Total discounts applied at the order level (line discounts stay in order_items). */
    @Column(name = "discount_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountTotal = BigDecimal.ZERO;

    /** Final amount payable: subtotal - discount_total. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "prepared_at")
    private OffsetDateTime preparedAt;

    @Column(name = "ready_at")
    private OffsetDateTime readyAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Items belonging to the order. Owned by the aggregate. */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    /** Payments associated with the order. Owned by the order lifecycle. */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<Payment> payments = new ArrayList<>();

    /** Initializes audit timestamps and sane defaults before first persistence. */
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (items == null || items.isEmpty()) {
            throw new IllegalStateException("Order must contain at least one item");
        }
        if (fulfillmentType == null) {
            fulfillmentType = FulfillmentType.PICKUP;
        }
        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }
        if (discountTotal == null) {
            discountTotal = BigDecimal.ZERO;
        }
        if (total == null) {
            total = BigDecimal.ZERO;
        }
        createdAt = now;
        updatedAt = now;
    }

    /** Refreshes the update timestamp on every mutation. */
    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    /** Adds an item while keeping the bidirectional association consistent. */
    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    /** Replaces all items while preserving orphan removal semantics. */
    public void replaceItems(List<OrderItem> newItems) {
        items.clear();
        if (newItems != null) {
            newItems.forEach(this::addItem);
        }
    }

    /** Adds a payment while keeping the bidirectional association consistent. */
    public void addPayment(Payment payment) {
        payment.setOrder(this);
        payments.add(payment);
    }

    /** Replaces all payments while preserving orphan removal semantics. */
    public void replacePayments(List<Payment> newPayments) {
        payments.clear();
        if (newPayments != null) {
            newPayments.forEach(this::addPayment);
        }
    }
}
