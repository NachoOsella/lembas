package com.dietetica.lembas.suppliers.model;

import com.dietetica.lembas.catalog.model.PricingRule;
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

/** Reviewed batch that previews supplier cost and catalog changes before applying them. */
@Entity
@Table(
        name = "price_update_batches",
        indexes = {
                @Index(name = "idx_price_update_batches_supplier_status", columnList = "supplier_id, status"),
                @Index(name = "idx_price_update_batches_created_at", columnList = "created_at DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class PriceUpdateBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Supplier whose list produced the batch. It can be null for generic manual batches. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PriceUpdateBatchType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PriceUpdateBatchStatus status = PriceUpdateBatchStatus.DRAFT;

    @Column(name = "source_file_name", length = 255)
    private String sourceFileName;

    @Column(name = "default_new_product_margin_percentage", precision = 5, scale = 2)
    private BigDecimal defaultNewProductMarginPercentage;

    @Column(name = "apply_cost_updates_by_default", nullable = false)
    private boolean applyCostUpdatesByDefault = true;

    @Column(name = "apply_sale_price_updates_by_default", nullable = false)
    private boolean applySalePriceUpdatesByDefault = true;

    @Column(name = "exclude_unchanged_by_default", nullable = false)
    private boolean excludeUnchangedByDefault = true;

    /** Optional rule that seeded the batch defaults. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pricing_rule_id")
    private PricingRule pricingRule;

    /** User who created the batch, when available. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PriceUpdateBatchItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "applied_at")
    private OffsetDateTime appliedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Adds an item while keeping both sides of the association consistent. */
    public void addItem(PriceUpdateBatchItem item) {
        item.setBatch(this);
        items.add(item);
    }

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
