package com.dietetica.lembas.payments.model;

import com.dietetica.lembas.orders.model.Order;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Unified payment record for ONLINE and POS orders.
 *
 * <p>Mercado Pago and in-store payments share this entity so reports and order
 * traceability can query one source of truth. The cash session is stored as a
 * scalar id until the cash module introduces its aggregate and foreign key.</p>
 */
@Entity
@Table(
        name = "payments",
        indexes = {
                @Index(name = "idx_payments_order_id", columnList = "order_id"),
                @Index(name = "idx_payments_cash_session_id", columnList = "cash_session_id"),
                @Index(name = "idx_payments_status", columnList = "status"),
                @Index(name = "idx_payments_provider_preference_id", columnList = "provider_preference_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Order paid by this record. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Open cash session id for in-store payments; null for online payments. */
    @Column(name = "cash_session_id")
    private Long cashSessionId;

    /** External or manual provider used to process the payment. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentProvider provider;

    /** Commercial payment method selected by the customer/employee. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentMethod method;

    /** Current lifecycle state of the payment. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    /** Positive payment amount in the configured currency. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** ISO 4217 currency code. MVP uses ARS. */
    @Column(nullable = false, length = 3)
    private String currency = "ARS";

    /** Provider-side payment id, used as an idempotency key for webhooks. */
    @Column(name = "provider_payment_id", unique = true, length = 255)
    private String providerPaymentId;

    /** Mercado Pago preference id created before redirecting the customer. */
    @Column(name = "provider_preference_id", length = 255)
    private String providerPreferenceId;

    /** External reference sent to providers to correlate callbacks with orders. */
    @Column(name = "external_reference", length = 255)
    private String externalReference;

    /** Timestamp when the payment was approved. */
    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    /** Sanitized provider metadata for audit/debugging without sensitive data. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Initializes audit timestamps and defaults before first persistence. */
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (currency == null || currency.isBlank()) {
            currency = "ARS";
        }
        createdAt = now;
        updatedAt = now;
    }

    /** Refreshes the update timestamp on every mutation. */
    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
