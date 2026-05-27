package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

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
}
