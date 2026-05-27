package com.dietetica.lembas.catalog.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Product category entity mapped to the {@code categories} table.
 *
 * <p>Categories form a self-referencing parent-child tree, allowing products to be
 * organised hierarchically (e.g. "Cereals" -> "Granola", "Avena"). Root categories
 * have a {@code null} parent.</p>
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>A category may have zero or one parent (root category = parent is {@code null}).</li>
 *   <li>A category may have zero or many child categories.</li>
 *   <li>A product belongs to exactly one category (optional — category_id may be null).</li>
 *   <li>Deleting a category is not allowed while products or child categories reference it
 *       (enforced by DB FK constraints).</li>
 *   <li>The name must be unique at the same tree level (application-enforced).</li>
 * </ul>
 *
 * @see com.dietetica.lembas.catalog.model.Category
 */
@Entity
@Table(
        name = "categories",
        indexes = {
                @Index(name = "idx_categories_parent_id", columnList = "parent_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** Self-referencing parent category for the hierarchy tree. Null for root categories. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @ToString.Exclude
    private Category parent;

    /** Display name of the category (e.g. "Cereales", "Suplementos"). */
    @Column(nullable = false, length = 255)
    @Setter
    private String name;

    /** Optional description visible in the online store and admin panel. */
    @Column(columnDefinition = "TEXT")
    @Setter
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Constructs a root category (no parent).
     *
     * @param name        display name
     * @param description optional description
     */
    public Category(String name, String description) {
        this.name = name;
        this.description = description;
    }

    /**
     * Constructs a child category under the given parent.
     *
     * @param parent      parent category
     * @param name        display name
     * @param description optional description
     */
    public Category(Category parent, String name, String description) {
        this.parent = parent;
        this.name = name;
        this.description = description;
    }
}
