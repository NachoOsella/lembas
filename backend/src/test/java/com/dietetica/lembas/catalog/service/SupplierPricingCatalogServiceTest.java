package com.dietetica.lembas.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.model.ProductSalePriceHistory;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.catalog.repository.ProductSalePriceHistoryRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

/** Contract tests for catalog operations consumed by supplier price-update batches. */
@ExtendWith(MockitoExtension.class)
class SupplierPricingCatalogServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductSalePriceHistoryRepository salePriceHistoryRepository;

    private SupplierPricingCatalogService service;

    @BeforeEach
    void setUp() {
        service = new SupplierPricingCatalogService(productRepository, categoryRepository, salePriceHistoryRepository);
    }

    @Test
    void findsActiveProductsForSupplierRowResolution() {
        Product product = new Product();
        when(productRepository.findByBarcodeIgnoreCaseAndActiveTrue("779001")).thenReturn(Optional.of(product));
        when(productRepository.findActiveByNameIgnoreCase("Yerba")).thenReturn(List.of(product));
        when(productRepository.findByIdAndActiveTrue(12L)).thenReturn(Optional.of(product));

        assertThat(service.findActiveProductByBarcode("779001")).containsSame(product);
        assertThat(service.findActiveProductsByExactName("Yerba")).containsExactly(product);
        assertThat(service.findActiveProductById(12L)).containsSame(product);
    }

    @Test
    void createsDraftProductWithTheExistingFirstCategoryFallback() {
        Category category = new Category("Supplier pricing", null);
        when(categoryRepository.findAll(PageRequest.of(0, 1))).thenReturn(new PageImpl<>(List.of(category)));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Product created = service.createDraftProductForSupplierPriceBatch("Yerba", "779001", new BigDecimal("8500.00"));

        assertThat(created.getCategory()).isSameAs(category);
        assertThat(created.getName()).isEqualTo("Yerba");
        assertThat(created.getBarcode()).isEqualTo("779001");
        assertThat(created.getSalePrice()).isEqualByComparingTo("8500.00");
        assertThat(created.getOnlineStatus()).isEqualTo(ProductOnlineStatus.DRAFT);
    }

    @Test
    void rejectsSupplierProductCreationWhenNoCategoryExists() {
        when(categoryRepository.findAll(PageRequest.of(0, 1))).thenReturn(new PageImpl<>(List.of()));

        assertThatThrownBy(() ->
                        service.createDraftProductForSupplierPriceBatch("Yerba", "779001", new BigDecimal("8500.00")))
                .isInstanceOf(DomainException.class)
                .extracting("code", "status")
                .containsExactly("CATEGORY_NOT_FOUND", HttpStatus.NOT_FOUND);
    }

    @Test
    void changesPriceAndRecordsSupplierBatchAuditHistory() {
        Product product = product(new BigDecimal("8000.00"));
        User user = mock(User.class);

        service.changeSalePriceForSupplierPriceBatch(product, new BigDecimal("8500.00"), 30L, user);

        assertThat(product.getSalePrice()).isEqualByComparingTo("8500.00");
        ArgumentCaptor<ProductSalePriceHistory> historyCaptor = ArgumentCaptor.forClass(ProductSalePriceHistory.class);
        verify(salePriceHistoryRepository).save(historyCaptor.capture());
        assertHistory(
                historyCaptor.getValue(), product, new BigDecimal("8000.00"), new BigDecimal("8500.00"), 30L, user);
    }

    @Test
    void recordsInitialSupplierBatchPriceHistory() {
        Product product = product(new BigDecimal("8500.00"));
        User user = mock(User.class);

        service.recordInitialSalePriceForSupplierPriceBatch(product, new BigDecimal("8500.00"), 30L, user);

        ArgumentCaptor<ProductSalePriceHistory> historyCaptor = ArgumentCaptor.forClass(ProductSalePriceHistory.class);
        verify(salePriceHistoryRepository).save(historyCaptor.capture());
        assertHistory(historyCaptor.getValue(), product, null, new BigDecimal("8500.00"), 30L, user);
    }

    private void assertHistory(
            ProductSalePriceHistory history,
            Product product,
            BigDecimal oldPrice,
            BigDecimal newPrice,
            Long batchId,
            User user) {
        assertThat(history.getProduct()).isSameAs(product);
        if (oldPrice == null) {
            assertThat(history.getOldPrice()).isNull();
        } else {
            assertThat(history.getOldPrice()).isEqualByComparingTo(oldPrice);
        }
        assertThat(history.getNewPrice()).isEqualByComparingTo(newPrice);
        assertThat(history.getSource()).isEqualTo("PRICE_BATCH");
        assertThat(history.getReason()).isEqualTo("Supplier price update batch");
        assertThat(history.getReferenceType()).isEqualTo("PRICE_UPDATE_BATCH");
        assertThat(history.getReferenceId()).isEqualTo(batchId);
        assertThat(history.getCreatedByUser()).isSameAs(user);
    }

    private Product product(BigDecimal salePrice) {
        Product product = new Product();
        product.setSalePrice(salePrice);
        return product;
    }
}
