package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

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

    /** Checks duplicated root category names, ignoring case. */
    boolean existsByParentIsNullAndNameIgnoreCase(String name);

    /** Checks duplicated child category names at the same parent level, ignoring case. */
    boolean existsByParentIdAndNameIgnoreCase(Long parentId, String name);

    /** Finds a root category by name, ignoring case. */
    Optional<Category> findByParentIsNullAndNameIgnoreCase(String name);

    /** Finds a child category by parent and name, ignoring case. */
    Optional<Category> findByParentIdAndNameIgnoreCase(Long parentId, String name);
}

