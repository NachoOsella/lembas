package com.dietetica.lembas.suppliers.model;

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
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/** Real merchandise arrival that creates stock only when confirmed. */
@Entity
@Table(
        name = "purchase_receipts",
        indexes = {
                @Index(name = "idx_purchase_receipts_order_id", columnList = "purchase_order_id"),
                @Index(name = "idx_purchase_receipts_supplier_status", columnList = "supplier_id,status"),
                @Index(name = "idx_purchase_receipts_branch_status", columnList = "branch_id,status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class PurchaseReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Purchase order being received. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    /** Supplier that delivered the merchandise. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    /** Branch where the merchandise arrived. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    /** Receipt lifecycle state. Confirmed receipts are immutable stock sources. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PurchaseReceiptStatus status = PurchaseReceiptStatus.CONFIRMED;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "received_at")
    private OffsetDateTime receivedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by_user_id")
    private User receivedByUser;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    /** Received product lines. Each confirmed line creates one stock lot. */
    @OneToMany(mappedBy = "purchaseReceipt", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<PurchaseReceiptItem> items = new ArrayList<>();

    /** Initializes timestamps before persistence. */
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        receivedAt = receivedAt == null ? now : receivedAt;
        confirmedAt = confirmedAt == null ? now : confirmedAt;
    }

    /** Adds an item while keeping the aggregate association consistent. */
    public void addItem(PurchaseReceiptItem item) {
        item.setPurchaseReceipt(this);
        items.add(item);
    }
}
