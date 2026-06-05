package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.SupplierProductRequest;
import com.dietetica.lembas.suppliers.dto.SupplierRequest;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.model.SupplierProduct;
import com.dietetica.lembas.suppliers.model.SupplierProductCostHistory;
import com.dietetica.lembas.suppliers.repository.SupplierProductCostHistoryRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for supplier and supplier-product cost use cases. */
@ExtendWith(MockitoExtension.class)
class SupplierServiceTest {
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private SupplierProductRepository supplierProductRepository;
    @Mock
    private SupplierProductCostHistoryRepository costHistoryRepository;
    @Mock
    private ProductRepository productRepository;

    private SupplierService supplierService;

    @BeforeEach
    void setUp() {
        supplierService = new SupplierService(supplierRepository, supplierProductRepository, costHistoryRepository, productRepository);
    }

    @Test
    void createSupplierShouldRejectDuplicatedCuit() {
        SupplierRequest request = new SupplierRequest("Proveedor", null, null, "proveedor@test.com", "20-123");
        when(supplierRepository.existsByCuitIgnoreCaseAndActiveTrue("20-123")).thenReturn(true);

        assertThatThrownBy(() -> supplierService.createSupplier(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("SUPPLIER_CUIT_DUPLICATED");

        verify(supplierRepository, never()).save(any());
    }

    @Test
    void createSupplierProductShouldPersistInitialCostHistory() {
        Product product = product(10L, "Yerba");
        Supplier supplier = supplier(20L, "Distribuidora");
        SupplierProductRequest request = new SupplierProductRequest(10L, 20L, "YER-1", BigDecimal.valueOf(5200), true);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(supplierRepository.findByIdAndActiveTrue(20L)).thenReturn(Optional.of(supplier));
        when(supplierProductRepository.save(any(SupplierProduct.class))).thenAnswer(invocation -> {
            SupplierProduct value = invocation.getArgument(0);
            value.setId(30L);
            return value;
        });

        var result = supplierService.createSupplierProduct(request);

        assertThat(result.currentCost()).isEqualByComparingTo("5200");
        assertThat(result.preferred()).isTrue();
        ArgumentCaptor<SupplierProductCostHistory> captor = ArgumentCaptor.forClass(SupplierProductCostHistory.class);
        verify(costHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().getOldCost()).isNull();
        assertThat(captor.getValue().getNewCost()).isEqualByComparingTo("5200");
        assertThat(captor.getValue().getSource()).isEqualTo("MANUAL_UPDATE");
    }

    /** Creates a product with the minimum fields used by supplier DTO mapping. */
    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setBarcode("779");
        return product;
    }

    /** Creates a supplier with the minimum fields used by supplier DTO mapping. */
    private Supplier supplier(Long id, String name) {
        Supplier supplier = new Supplier();
        supplier.setId(id);
        supplier.setName(name);
        return supplier;
    }
}
