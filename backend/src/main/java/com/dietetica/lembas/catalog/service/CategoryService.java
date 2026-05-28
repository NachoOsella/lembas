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

    /** Lists all categories for admin management. */
    @Transactional(readOnly = true)
    public List<CategoryDto> listAdminCategories() {
        return categoryRepository.findAllByOrderByNameAsc(
                        PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.ASC, "name")))
                .getContent()
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Lists categories matching the search term for admin management.
     *
     * @param search optional search term (trimmed and lowercased); when null or blank, returns all categories
     * @return categories matching the search term
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

    /** Creates a category after validating parent and duplicated names. */
    @Transactional
    public CategoryDto create(CategoryRequest request) {
        Category parent = resolveParent(request.parentId());
        validateUniqueNameAtLevel(request.name(), parent, null);
        Category category = new Category(parent, request.name().trim(), normalizeBlank(request.description()));
        return toDto(categoryRepository.save(category));
    }

    /** Updates a category and its optional parent relation. */
    @Transactional
    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = findById(id);
        Category parent = resolveParent(request.parentId());
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
     * Deletes a category after verifying it has no child categories or product
     * references. Throws a {@link DomainException} with a clear message when
     * the category cannot be deleted.
     */
    @Transactional
    public void delete(Long id) {
        Category category = findById(id);

        if (categoryRepository.existsByParentId(id)) {
            throw new DomainException(
                    "CATEGORY_HAS_CHILDREN",
                    HttpStatus.CONFLICT,
                    "Cannot delete category \"" + category.getName() + "\": it has child categories"
            );
        }

        long productCount = categoryRepository.countProductsByCategoryId(id);
        if (productCount > 0) {
            throw new DomainException(
                    "CATEGORY_HAS_PRODUCTS",
                    HttpStatus.CONFLICT,
                    "Cannot delete category \"" + category.getName() + "\": " + productCount + " product(s) reference it"
            );
        }

        categoryRepository.delete(category);
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

    /** Resolves a nullable parent id to an entity. */
    private Category resolveParent(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return categoryRepository.findById(parentId)
                .orElseThrow(() -> new DomainException("PARENT_NOT_FOUND", HttpStatus.NOT_FOUND, "Parent category not found"));
    }

    /** Ensures category names are unique among siblings or root categories. */
    private void validateUniqueNameAtLevel(String rawName, Category parent, Long currentId) {
        String name = rawName.trim();
        Optional<Category> duplicated = parent == null
                ? categoryRepository.findByParentIsNullAndNameIgnoreCase(name)
                : categoryRepository.findByParentIdAndNameIgnoreCase(parent.getId(), name);
        if (duplicated.isPresent() && !duplicated.get().getId().equals(currentId)) {
            throw new DomainException("CATEGORY_NAME_DUPLICATED", HttpStatus.CONFLICT, "Category name already exists at this level");
        }
    }

    /** Finds a category by id or throws the uniform not-found error. */
    private Category findById(Long id) {
        return categoryRepository.findById(id)
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
