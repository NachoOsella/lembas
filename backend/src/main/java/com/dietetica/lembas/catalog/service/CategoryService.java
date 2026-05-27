package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.CategoryStoreDto;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for category management operations.
 */
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /**
     * Lists all categories for the public store, ordered alphabetically.
     * <p>
     * TODO: wire {@code productCount} to a {@code COUNT(*)} query against the
     * {@code products} table filtering by {@code online_status = 'PUBLISHED'}
     * once the Product entity is available.
     *
     * @return list of store-facing category DTOs
     */
    @Transactional(readOnly = true)
    public List<CategoryStoreDto> listStoreCategories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(category -> new CategoryStoreDto(
                        category.getId(),
                        category.getName(),
                        0L // TODO: replace with actual published product count
                ))
                .toList();
    }
}
