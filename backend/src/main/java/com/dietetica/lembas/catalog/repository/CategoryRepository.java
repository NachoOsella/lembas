package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Repository for {@link Category} entity.
 */
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Returns all categories ordered alphabetically for deterministic display.
     *
     * @return categories sorted by name ascending
     */
    List<Category> findAllByOrderByNameAsc();

    /**
     * Returns categories ordered alphabetically with an explicit page-size cap.
     *
     * @param pageable page request used to cap result size
     * @return page of categories ordered by name
     */
    Page<Category> findAllByOrderByNameAsc(Pageable pageable);

    /**
     * Returns categories matching the search term, ordered alphabetically.
     * Searches across name and description fields.
     *
     * @param search the search term (trimmed, lowercased in the service layer;
     *               the query applies {@code lower()} on column values)
     * @return categories matching the search term, sorted by name ascending
     */
    @Query("""
            select c from Category c
            where (:search is null or (
                lower(c.name) like concat('%', cast(:search as string), '%')
                or lower(c.description) like concat('%', cast(:search as string), '%')
            ))
            order by c.name asc
            """)
    List<Category> searchCategories(@Param("search") String search);

    /**
     * Returns categories matching search with an explicit page-size cap.
     *
     * @param search optional search term
     * @param pageable page request used to cap result size
     * @return page of matching categories ordered by name
     */
    @Query("""
            select c from Category c
            where (:search is null or (
                lower(c.name) like concat('%', cast(:search as string), '%')
                or lower(c.description) like concat('%', cast(:search as string), '%')
            ))
            order by c.name asc
            """)
    Page<Category> searchCategories(@Param("search") String search, Pageable pageable);

    /** Checks duplicated root category names, ignoring case. */
    boolean existsByParentIsNullAndNameIgnoreCase(String name);

    /** Checks duplicated child category names at the same parent level, ignoring case. */
    boolean existsByParentIdAndNameIgnoreCase(Long parentId, String name);

    /** Finds a root category by name, ignoring case. */
    Optional<Category> findByParentIsNullAndNameIgnoreCase(String name);

    /** Finds a child category by parent and name, ignoring case. */
    Optional<Category> findByParentIdAndNameIgnoreCase(Long parentId, String name);

    /** Returns true when the category has at least one child category. */
    boolean existsByParentId(Long parentId);

    /**
     * Counts products assigned to the given category (native query because the
     * Product entity is not yet mapped in JPA).
     */
    @Query(value = "SELECT COUNT(*) FROM products WHERE category_id = :categoryId", nativeQuery = true)
    long countProductsByCategoryId(Long categoryId);

    /**
     * Lightweight projection for store-facing category listings.
     */
    interface CategoryStoreSummaryProjection {
        Long getId();

        String getName();

        long getProductCount();
    }

    /**
     * Returns categories with counts of active and published products.
     */
    @Query(value = """
            select
                c.id as id,
                c.name as name,
                coalesce(count(p.id), 0) as productCount
            from categories c
            left join products p
                on p.category_id = c.id
               and p.active = true
               and p.online_status = 'PUBLISHED'
            group by c.id, c.name
            order by c.name asc
            """, nativeQuery = true)
    Page<CategoryStoreSummaryProjection> findStoreCategorySummaries(Pageable pageable);
}

