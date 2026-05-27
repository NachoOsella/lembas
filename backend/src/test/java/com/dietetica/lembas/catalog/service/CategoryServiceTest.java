package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.CategoryRequest;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for category creation, edition and parent validation rules. */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    @Test
    void createShouldPersistRootCategory() {
        Category saved = new Category(1L, null, "Cereales", "Integrales");
        when(categoryRepository.findByParentIsNullAndNameIgnoreCase("Cereales")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(saved);

        var result = categoryService.create(new CategoryRequest(" Cereales ", null, " Integrales "));

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.parentId()).isNull();
        assertThat(result.name()).isEqualTo("Cereales");
    }

    @Test
    void updateShouldRejectSelfParent() {
        Category category = new Category(7L, null, "Yerbas", null);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> categoryService.update(7L, new CategoryRequest("Yerbas", 7L, null)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("own parent");
    }

    @Test
    void createShouldRejectDuplicatedNameAtSameLevel() {
        Category existing = new Category(3L, null, "Suplementos", null);
        when(categoryRepository.findByParentIsNullAndNameIgnoreCase("Suplementos")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> categoryService.create(new CategoryRequest("Suplementos", null, null)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deleteShouldThrowWhenCategoryHasChildren() {
        Category category = new Category(5L, null, "Cereales", null);
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByParentId(5L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(5L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("has child categories");
    }

    @Test
    void deleteShouldSucceedWhenNoChildrenOrProducts() {
        Category category = new Category(6L, null, "Snacks", null);
        when(categoryRepository.findById(6L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByParentId(6L)).thenReturn(false);
        when(categoryRepository.countProductsByCategoryId(6L)).thenReturn(0L);

        categoryService.delete(6L);

        verify(categoryRepository).delete(category);
    }
}
