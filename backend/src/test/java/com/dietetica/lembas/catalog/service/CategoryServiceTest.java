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

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
        when(categoryRepository.existsByParentIsNullAndNameIgnoreCaseAndActiveTrue("Cereales")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(saved);

        var result = categoryService.create(new CategoryRequest(" Cereales ", null, " Integrales "));

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.parentId()).isNull();
        assertThat(result.name()).isEqualTo("Cereales");
    }

    @Test
    void updateShouldRejectSelfParent() {
        Category category = new Category(7L, null, "Yerbas", null);
        when(categoryRepository.findByIdAndActiveTrue(7L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> categoryService.update(7L, new CategoryRequest("Yerbas", 7L, null)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("own parent");
    }

    @Test
    void createShouldRejectDuplicatedNameAtSameLevel() {
        when(categoryRepository.existsByParentIsNullAndNameIgnoreCaseAndActiveTrue("Suplementos")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(new CategoryRequest("Suplementos", null, null)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deleteShouldThrowWhenCategoryHasActiveChildren() {
        Category category = new Category(5L, null, "Cereales", null);
        when(categoryRepository.findByIdAndActiveTrue(5L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByParentIdAndActiveTrue(5L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(5L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("has active child categories");
    }

    @Test
    void deleteShouldSoftDeleteWhenNoActiveChildrenOrProducts() {
        Category category = new Category(6L, null, "Snacks", null);
        when(categoryRepository.findByIdAndActiveTrue(6L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByParentIdAndActiveTrue(6L)).thenReturn(false);
        when(categoryRepository.countActiveProductsByCategoryId(6L)).thenReturn(0L);

        categoryService.delete(6L);

        assertThat(category.isActive()).isFalse();
        verify(categoryRepository, org.mockito.Mockito.never()).delete(any());
    }

    @Test
    void searchCategoriesShouldReturnMatchingActiveByName() {
        Category c1 = new Category(1L, null, "Granola integral", "Con almendras");
        Category c2 = new Category(2L, null, "Granola tropical", "Con frutas");
        when(categoryRepository.searchCategories(eq("granola"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(c1, c2)));

        var result = categoryService.searchCategories("granola");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).name()).isEqualTo("Granola integral");
    }

    @Test
    void searchCategoriesShouldReturnMatchingByDescription() {
        Category c1 = new Category(1L, null, "Snacks", "Snacks saludables y nutritivos");
        when(categoryRepository.searchCategories(eq("nutritivos"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(c1)));

        var result = categoryService.searchCategories("nutritivos");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Snacks");
    }

    @Test
    void searchCategoriesShouldReturnAllWhenSearchIsBlank() {
        Category c1 = new Category(1L, null, "Cereales", null);
        Category c2 = new Category(2L, null, "Yerbas", null);
        when(categoryRepository.searchCategories(eq(null), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(c1, c2)));

        var result = categoryService.searchCategories(null);

        assertThat(result).hasSize(2);
    }

    @Test
    void searchCategoriesShouldNormalizeSearchTerm() {
        when(categoryRepository.searchCategories(eq("granola"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        categoryService.searchCategories("  Granola  ");

        verify(categoryRepository).searchCategories(eq("granola"), any(PageRequest.class));
    }
}
