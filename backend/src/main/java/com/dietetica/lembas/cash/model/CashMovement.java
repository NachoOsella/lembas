package com.dietetica.lembas.cash.model;

import com.dietetica.lembas.users.model.User;
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
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Manual cash movement registered during an OPEN cash session.
 *
 * <p>The table {@code cash_movements} is already defined by
 * {@code V27__cash.sql} with CHECK constraints for type, method and amount.
 * This entity mirrors that schema.</p>
 *
 * @see CashMovementType
 * @see CashMovementMethod
 */
@Entity
@Table(
        name = "cash_movements",
        indexes = {
                @Index(name = "idx_cash_movements_cash_session_id", columnList = "cash_session_id"),
                @Index(name = "idx_cash_movements_created_by_user_id", columnList = "created_by_user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class CashMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Session this movement belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cash_session_id", nullable = false)
    private CashSession cashSession;

    /** User that registered the movement. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdByUser;

    /** Direction of the movement. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashMovementType type;

    /** Payment instrument used for the movement. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashMovementMethod method;

    /** Absolute amount of the movement. Must be != 0. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /** Mandatory explanation for the movement. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}