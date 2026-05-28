package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for product catalog creation, edition and validation rules. */
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    void createShouldPersistProductWithValidCategory() {
        Category category = new Category(5L, null, "Cereales", null);
        Product saved = productWithId(10L, category, "Granola", "7790001", BigDecimal.valueOf(1200));
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        when(productRepository.existsByBarcodeIgnoreCaseAndActiveTrue("7790001")).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(saved);

        var result = productService.create(request("Granola", "7790001", 5L, BigDecimal.valueOf(1200)));

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.categoryName()).isEqualTo("Cereales");
        assertThat(result.salePrice()).isEqualByComparingTo("1200");
    }

    @Test
    void createShouldRejectDuplicatedBarcode() {
        when(productRepository.existsByBarcodeIgnoreCaseAndActiveTrue("7790001")).thenReturn(true);

        assertThatThrownBy(() -> productService.create(request("Granola", "7790001", 5L, BigDecimal.ONE)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("barcode already exists");
    }

    @Test
    void createShouldRejectMissingCategory() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.create(request("Granola", null, 99L, BigDecimal.ONE)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Category not found");
    }

    @Test
    void updateShouldRejectBarcodeOwnedByAnotherProduct() {
        Category category = new Category(5L, null, "Cereales", null);
        Product product = productWithId(10L, category, "Granola", "7790001", BigDecimal.ONE);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(productRepository.existsByBarcodeIgnoreCaseAndActiveTrueAndIdNot("7790002", 10L)).thenReturn(true);

        assertThatThrownBy(() -> productService.update(10L, request("Granola", "7790002", 5L, BigDecimal.TEN)))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("barcode already exists");
    }

    @Test
    void deleteShouldMarkProductInactive() {
        Category category = new Category(5L, null, "Cereales", null);
        Product product = productWithId(10L, category, "Granola", null, BigDecimal.ONE);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));

        productService.delete(10L);

        assertThat(product.isActive()).isFalse();
        verify(productRepository).findByIdAndActiveTrue(10L);
    }

    private ProductRequest request(String name, String barcode, Long categoryId, BigDecimal salePrice) {
        return new ProductRequest(name, "Rico y natural", "Lembas", barcode, categoryId, salePrice, 2, null, ProductOnlineStatus.DRAFT);
    }

    private Product productWithId(Long id, Category category, String name, String barcode, BigDecimal salePrice) {
        Product product = new Product();
        product.setId(id);
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(salePrice);
        product.setMinimumStock(2);
        product.setOnlineStatus(ProductOnlineStatus.DRAFT);
        return product;
    }
}
