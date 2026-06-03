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
     * Returns active categories ordered alphabetically for deterministic display.
     *
     * @return active categories sorted by name ascending
     */
    List<Category> findByActiveTrueOrderByNameAsc();

    /**
     * Returns active categories ordered alphabetically with an explicit page-size cap.
     *
     * @param pageable page request used to cap result size
     * @return page of active categories ordered by name
     */
    Page<Category> findByActiveTrueOrderByNameAsc(Pageable pageable);

    /**
     * Finds an active category by id.
     *
     * @param id category id
     * @return optional with the active category, empty if not found or inactive
     */
    Optional<Category> findByIdAndActiveTrue(Long id);

    /**
     * Returns active categories matching the search term, ordered alphabetically.
     * Searches across name and description fields.
     *
     * @param search the search term (trimmed, lowercased in the service layer;
     *               the query applies {@code lower()} on column values)
     * @return active categories matching the search term, sorted by name ascending
     */
    @Query("""
            select c from Category c
            where c.active = true
              and (:search is null or (
                lower(c.name) like concat('%', cast(:search as string), '%')
                or lower(c.description) like concat('%', cast(:search as string), '%')
            ))
            order by c.name asc
            """)
    List<Category> searchCategories(@Param("search") String search);

    /**
     * Returns active categories matching search with an explicit page-size cap.
     *
     * @param search optional search term
     * @param pageable page request used to cap result size
     * @return page of matching active categories ordered by name
     */
    @Query("""
            select c from Category c
            where c.active = true
              and (:search is null or (
                lower(c.name) like concat('%', cast(:search as string), '%')
                or lower(c.description) like concat('%', cast(:search as string), '%')
            ))
            order by c.name asc
            """)
    Page<Category> searchCategories(@Param("search") String search, Pageable pageable);

    /** Checks duplicated root category names among active categories, ignoring case. */
    boolean existsByParentIsNullAndNameIgnoreCaseAndActiveTrue(String name);

    /** Checks duplicated child category names at the same parent level among active categories, ignoring case. */
    boolean existsByParentIdAndNameIgnoreCaseAndActiveTrue(Long parentId, String name);



    /** Returns true when the category has at least one active child category. */
    boolean existsByParentIdAndActiveTrue(Long parentId);

    /** Finds a root category by name, ignoring case. */
    Optional<Category> findByParentIsNullAndNameIgnoreCase(String name);

    /** Finds a child category by parent and name, ignoring case. */
    Optional<Category> findByParentIdAndNameIgnoreCase(Long parentId, String name);

    /**
     * Counts active products assigned to the given category.
     */
    @Query(value = "SELECT COUNT(*) FROM products WHERE category_id = :categoryId AND active = true", nativeQuery = true)
    long countActiveProductsByCategoryId(Long categoryId);

    /**
     * Lightweight projection for store-facing category listings.
     */
    interface CategoryStoreSummaryProjection {
        Long getId();

        String getName();

        long getProductCount();
    }

    /**
     * Returns active categories with counts of active and published products.
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
            where c.active = true
            group by c.id, c.name
            order by c.name asc
            """, nativeQuery = true)
    Page<CategoryStoreSummaryProjection> findStoreCategorySummaries(Pageable pageable);
}

