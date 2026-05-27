package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.catalog.dto.CategoryStoreDto;
import com.dietetica.lembas.catalog.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public REST controller for the online store category browsing.
 *
 * <p>All endpoints are publicly accessible (no authentication required)
 * as configured in {@link com.dietetica.lembas.shared.config.SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/store/categories")
public class CategoryStoreController {

    private final CategoryService categoryService;

    public CategoryStoreController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    /**
     * Lists all categories available in the public store, ordered alphabetically.
     *
     * @return list of store-facing category DTOs
     */
    @GetMapping
    public List<CategoryStoreDto> listCategories() {
        return categoryService.listStoreCategories();
    }
}
