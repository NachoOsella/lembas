package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.CategoryDto;
import com.dietetica.lembas.catalog.dto.CategoryRequest;
import com.dietetica.lembas.catalog.dto.CategoryStoreDto;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Service for category management operations.
 */
@Service
public class CategoryService {

    private static final int MAX_LIST_SIZE = 500;

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /** Lists all active categories for admin management. */
    @Transactional(readOnly = true)
    public List<CategoryDto> listAdminCategories() {
        return categoryRepository.findByActiveTrueOrderByNameAsc(
                        PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.ASC, "name")))
                .getContent()
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Lists active categories matching the search term for admin management.
     *
     * @param search optional search term (trimmed and lowercased); when null or blank, returns all active categories
     * @return active categories matching the search term
     */
    @Transactional(readOnly = true)
    public List<CategoryDto> searchCategories(String search) {
        String normalizedSearch = (search == null || search.isBlank())
                ? null
                : search.trim().toLowerCase(Locale.ROOT);
        return categoryRepository.searchCategories(
                        normalizedSearch,
                        PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.ASC, "name")))
                .getContent()
                .stream()
                .map(this::toDto)
                .toList();
    }

    /** Creates a category after validating parent and duplicated names among active categories. */
    @Transactional
    public CategoryDto create(CategoryRequest request) {
        Category parent = resolveActiveParent(request.parentId());
        validateUniqueNameAtLevel(request.name(), parent, null);
        Category category = new Category(parent, request.name().trim(), normalizeBlank(request.description()));
        return toDto(categoryRepository.save(category));
    }

    /** Updates a category and its optional parent relation. */
    @Transactional
    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = findActiveById(id);
        Category parent = resolveActiveParent(request.parentId());
        if (parent != null && parent.getId().equals(id)) {
            throw new DomainException("PARENT_INVALID", "A category cannot be its own parent");
        }
        validateNoHierarchyCycle(id, parent);
        validateUniqueNameAtLevel(request.name(), parent, id);
        category.setParent(parent);
        category.setName(request.name().trim());
        category.setDescription(normalizeBlank(request.description()));
        return toDto(category);
    }

    /**
     * Soft-deletes a category after verifying it has no active child categories
     * or active product references. Throws a {@link DomainException} with a clear
     * message when the category cannot be deleted.
     */
    @Transactional
    public void delete(Long id) {
        Category category = findActiveById(id);

        if (categoryRepository.existsByParentIdAndActiveTrue(id)) {
            throw new DomainException(
                    "CATEGORY_HAS_CHILDREN",
                    HttpStatus.CONFLICT,
                    "Cannot delete category \"" + category.getName() + "\": it has active child categories"
            );
        }

        long productCount = categoryRepository.countActiveProductsByCategoryId(id);
        if (productCount > 0) {
            throw new DomainException(
                    "CATEGORY_HAS_PRODUCTS",
                    HttpStatus.CONFLICT,
                    "Cannot delete category \"" + category.getName() + "\": " + productCount + " active product(s) reference it"
            );
        }

        category.setActive(false);
    }

    /**
     * Lists all categories for the public store, ordered alphabetically,
     * with the count of products in each category.
     */
    @Transactional(readOnly = true)
    public List<CategoryStoreDto> listStoreCategories() {
        return categoryRepository.findStoreCategorySummaries(
                        PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.ASC, "name")))
                .getContent()
                .stream()
                .map(summary -> new CategoryStoreDto(
                        summary.getId(),
                        summary.getName(),
                        summary.getProductCount()
                ))
                .toList();
    }

    /**
     * Validates that assigning the provided parent does not create a hierarchy cycle.
     */
    private void validateNoHierarchyCycle(Long categoryId, Category parent) {
        Set<Long> visited = new HashSet<>();
        Category cursor = parent;

        while (cursor != null) {
            Long cursorId = cursor.getId();
            if (cursorId != null && cursorId.equals(categoryId)) {
                throw new DomainException(
                        "CATEGORY_HIERARCHY_CYCLE",
                        HttpStatus.CONFLICT,
                        "Category hierarchy cannot contain cycles"
                );
            }

            if (cursorId != null && !visited.add(cursorId)) {
                throw new DomainException(
                        "CATEGORY_HIERARCHY_CYCLE",
                        HttpStatus.CONFLICT,
                        "Category hierarchy cannot contain cycles"
                );
            }

            cursor = cursor.getParent();
        }
    }


    /** Resolves a nullable parent id to an active entity. */
    private Category resolveActiveParent(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return categoryRepository.findByIdAndActiveTrue(parentId)
                .orElseThrow(() -> new DomainException("PARENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Parent category not found"));
    }

    /** Ensures category names are unique among active siblings or root categories. */
    private void validateUniqueNameAtLevel(String rawName, Category parent, Long currentId) {
        String name = rawName.trim();
        boolean duplicated = parent == null
                ? categoryRepository.existsByParentIsNullAndNameIgnoreCaseAndActiveTrue(name)
                : categoryRepository.existsByParentIdAndNameIgnoreCaseAndActiveTrue(parent.getId(), name);
        // When updating, exclude the current category from the duplicate check
        if (duplicated && currentId != null) {
            Optional<Category> existing = parent == null
                    ? categoryRepository.findByParentIsNullAndNameIgnoreCase(name)
                    : categoryRepository.findByParentIdAndNameIgnoreCase(parent.getId(), name);
            duplicated = existing.isPresent() && !existing.get().getId().equals(currentId);
        }
        if (duplicated) {
            throw new DomainException("CATEGORY_NAME_DUPLICATED", HttpStatus.CONFLICT, "Category name already exists at this level");
        }
    }

    /** Finds an active category by id or throws the uniform not-found error. */
    private Category findActiveById(Long id) {
        return categoryRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("CATEGORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Category not found"));
    }

    /** Converts blank optional strings to null before persistence. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Maps an entity to its API DTO without exposing JPA internals. */
    private CategoryDto toDto(Category category) {
        Long parentId = category.getParent() == null ? null : category.getParent().getId();
        return new CategoryDto(category.getId(), parentId, category.getName(), category.getDescription());
    }
}
