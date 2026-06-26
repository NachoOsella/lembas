package com.dietetica.lembas.cash.model;

import com.dietetica.lembas.shared.branch.model.Branch;
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

/**
 * Cash register session for a branch.
 *
 * <p>Represents one shift: opened by an employee with a declared initial cash
 * amount, later closed by counting the drawer. Business rules live in
 * {@code CashService}; the DB guarantees one OPEN session per branch through
 * the partial unique index {@code uk_cash_sessions_one_open_per_branch}.</p>
 *
 * <p>Close-only fields ({@code expectedCashAmount}, {@code countedCashAmount},
 * {@code cashDifferenceAmount}, {@code closedByUser}, {@code closedAt},
 * {@code closingNotes}) are {@code null} while OPEN and are populated by the
 * close use case in a later story.</p>
 */
@Entity
@Table(
        name = "cash_sessions",
        indexes = {
                @Index(name = "idx_cash_sessions_branch_id", columnList = "branch_id"),
                @Index(name = "idx_cash_sessions_branch_status", columnList = "branch_id,status"),
                @Index(name = "idx_cash_sessions_opened_by_user_id", columnList = "opened_by_user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class CashSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Branch that owns this cash drawer. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** Employee/admin that opened the session. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "opened_by_user_id", nullable = false)
    private User openedByUser;

    /** Employee/admin that closed the session; null while OPEN. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by_user_id")
    private User closedByUser;

    /** When the session was opened. Defaults to now at insert time. */
    @Column(name = "opened_at", nullable = false)
    private OffsetDateTime openedAt;

    /** When the session was closed; null while OPEN. */
    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    /** Declared initial cash in the drawer at opening. Must be {@code >= 0}. */
    @Column(name = "opening_cash_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal openingCashAmount;

    /** Computed expected cash at close. Null while OPEN. */
    @Column(name = "expected_cash_amount", precision = 12, scale = 2)
    private BigDecimal expectedCashAmount;

    /** Physically counted cash at close. Null while OPEN. */
    @Column(name = "counted_cash_amount", precision = 12, scale = 2)
    private BigDecimal countedCashAmount;

    /** Difference between counted and expected cash at close. Null while OPEN. */
    @Column(name = "cash_difference_amount", precision = 12, scale = 2)
    private BigDecimal cashDifferenceAmount;

    /** Mandatory explanation when the close difference is non-zero. Null while OPEN. */
    @Column(name = "cash_difference_reason", columnDefinition = "TEXT")
    private String cashDifferenceReason;

    /** Current lifecycle state. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CashSessionStatus status;

    /** Optional notes captured at opening. */
    @Column(name = "opening_notes", columnDefinition = "TEXT")
    private String openingNotes;

    /** Optional notes captured at close. Null while OPEN. */
    @Column(name = "closing_notes", columnDefinition = "TEXT")
    private String closingNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Initializes audit timestamps and sane defaults before first persistence. */
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (openedAt == null) {
            openedAt = now;
        }
        if (status == null) {
            status = CashSessionStatus.OPEN;
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