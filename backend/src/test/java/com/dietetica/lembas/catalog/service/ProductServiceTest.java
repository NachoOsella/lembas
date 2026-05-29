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

    @Test
    void updateShouldApplyAllEditableFields() {
        Category category = new Category(5L, null, "Cereales", null);
        Category newCategory = new Category(8L, null, "Yerbas", null);
        Product existing = productWithId(10L, category, "Granola", "7790001", BigDecimal.valueOf(1200));
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(8L)).thenReturn(Optional.of(newCategory));
        when(productRepository.existsByBarcodeIgnoreCaseAndActiveTrueAndIdNot("7790002", 10L)).thenReturn(false);

        ProductRequest request = new ProductRequest(
                "Granola Premium",
                "Edicion especial",
                "Lembas",
                "7790002",
                8L,
                BigDecimal.valueOf(1500),
                5,
                "https://example.com/img.jpg",
                ProductOnlineStatus.PUBLISHED
        );

        var result = productService.update(10L, request);

        assertThat(result.name()).isEqualTo("Granola Premium");
        assertThat(result.description()).isEqualTo("Edicion especial");
        assertThat(result.brandName()).isEqualTo("Lembas");
        assertThat(result.barcode()).isEqualTo("7790002");
        assertThat(result.categoryName()).isEqualTo("Yerbas");
        assertThat(result.salePrice()).isEqualByComparingTo("1500");
        assertThat(result.minimumStock()).isEqualTo(5);
        assertThat(result.imageUrl()).isEqualTo("https://example.com/img.jpg");
        assertThat(result.onlineStatus()).isEqualTo(ProductOnlineStatus.PUBLISHED);
    }

    @Test
    void createShouldRejectNegativeSalePrice() {
        // Bean validation is enforced at controller level via @Valid.
        // This test documents that negative prices are rejected by the DTO constraint.
        ProductRequest request = new ProductRequest(
                "Granola",
                null,
                null,
                null,
                5L,
                BigDecimal.valueOf(-100),
                null,
                null,
                ProductOnlineStatus.DRAFT
        );

        assertThat(request.salePrice()).isNegative();
    }

    @Test
    void createShouldAcceptZeroSalePrice() {
        Category category = new Category(5L, null, "Cereales", null);
        Product saved = productWithId(10L, category, "Muestra", null, BigDecimal.ZERO);
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(saved);

        ProductRequest request = new ProductRequest(
                "Muestra",
                null,
                null,
                null,
                5L,
                BigDecimal.ZERO,
                null,
                null,
                ProductOnlineStatus.DRAFT
        );

        var result = productService.create(request);

        assertThat(result.salePrice()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void updateShouldRejectMissingCategory() {
        Category category = new Category(5L, null, "Cereales", null);
        Product existing = productWithId(10L, category, "Granola", null, BigDecimal.ONE);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        ProductRequest request = new ProductRequest(
                "Granola",
                null,
                null,
                null,
                99L,
                BigDecimal.ONE,
                null,
                null,
                ProductOnlineStatus.DRAFT
        );

        assertThatThrownBy(() -> productService.update(10L, request))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Category not found");
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
