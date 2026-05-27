package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Category;
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
}

