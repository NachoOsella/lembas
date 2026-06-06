package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderRequest;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.model.SupplierProduct;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for purchase order creation and transitions. */
@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private SupplierProductRepository supplierProductRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private SecurityContextHelper securityContextHelper;

    private PurchaseOrderService service;

    @BeforeEach
    void setUp() {
        service = new PurchaseOrderService(purchaseOrderRepository, supplierRepository, supplierProductRepository, branchRepository, securityContextHelper);
        lenient().when(securityContextHelper.getCurrentUser()).thenThrow(new IllegalStateException("No principal"));
    }

    @Test
    void createShouldPreloadCurrentCostAndCalculateTotalWithoutStockDependencies() {
        Supplier supplier = supplier(10L, "Distribuidora");
        Branch branch = branch(20L, "Centro");
        SupplierProduct supplierProduct = supplierProduct(30L, supplier, product(40L, "Yerba"), BigDecimal.valueOf(2200));
        PurchaseOrderRequest request = new PurchaseOrderRequest(
                10L,
                20L,
                LocalDate.of(2026, 7, 1),
                " Entregar por la mañana ",
                List.of(new PurchaseOrderItemRequest(30L, BigDecimal.valueOf(2), null))
        );
        when(supplierRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(supplier));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(supplierProductRepository.findByIdAndActiveTrue(30L)).thenReturn(Optional.of(supplierProduct));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> {
            PurchaseOrder order = invocation.getArgument(0);
            order.setId(50L);
            return order;
        });

        var result = service.create(request);

        assertThat(result.total()).isEqualByComparingTo("4400.00");
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().unitCost()).isEqualByComparingTo("2200");
        assertThat(result.items().getFirst().subtotal()).isEqualByComparingTo("4400.00");
        ArgumentCaptor<PurchaseOrder> orderCaptor = ArgumentCaptor.forClass(PurchaseOrder.class);
        verify(purchaseOrderRepository).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getStatus()).isEqualTo(PurchaseOrderStatus.DRAFT);
        assertThat(orderCaptor.getValue().getNotes()).isEqualTo("Entregar por la mañana");
    }

    @Test
    void createShouldRejectProductsOutsideSelectedSupplier() {
        Supplier selectedSupplier = supplier(10L, "Distribuidora");
        Supplier otherSupplier = supplier(11L, "Otro");
        Branch branch = branch(20L, "Centro");
        SupplierProduct supplierProduct = supplierProduct(30L, otherSupplier, product(40L, "Yerba"), BigDecimal.valueOf(2200));
        PurchaseOrderRequest request = new PurchaseOrderRequest(
                10L,
                20L,
                null,
                null,
                List.of(new PurchaseOrderItemRequest(30L, BigDecimal.ONE, BigDecimal.valueOf(2300)))
        );
        when(supplierRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(selectedSupplier));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(supplierProductRepository.findByIdAndActiveTrue(30L)).thenReturn(Optional.of(supplierProduct));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID");
    }

    @Test
    void confirmAndSendShouldApplyValidStateTransitions() {
        PurchaseOrder order = order(PurchaseOrderStatus.DRAFT);
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        var confirmed = service.confirm(1L);
        assertThat(confirmed.status()).isEqualTo("CONFIRMED");
        assertThat(order.getConfirmedAt()).isNotNull();

        var sent = service.send(1L);
        assertThat(sent.status()).isEqualTo("SENT");
        assertThat(order.getSentAt()).isNotNull();
    }

    @Test
    void sendShouldRejectDraftOrders() {
        PurchaseOrder order = order(PurchaseOrderStatus.DRAFT);
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.send(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PURCHASE_ORDER_INVALID_STATE");
    }

    /** Creates an order with one item for transition tests. */
    private PurchaseOrder order(PurchaseOrderStatus status) {
        Supplier supplier = supplier(10L, "Distribuidora");
        PurchaseOrder order = new PurchaseOrder();
        order.setId(1L);
        order.setSupplier(supplier);
        order.setBranch(branch(20L, "Centro"));
        order.setStatus(status);
        SupplierProduct supplierProduct = supplierProduct(30L, supplier, product(40L, "Yerba"), BigDecimal.valueOf(2200));
        com.dietetica.lembas.suppliers.model.PurchaseOrderItem item = new com.dietetica.lembas.suppliers.model.PurchaseOrderItem();
        item.setProduct(supplierProduct.getProduct());
        item.setSupplierProduct(supplierProduct);
        item.setQuantityOrdered(BigDecimal.ONE);
        item.setUnitCost(BigDecimal.valueOf(2200));
        item.setSubtotal(BigDecimal.valueOf(2200));
        order.addItem(item);
        return order;
    }

    /** Creates a product with fields used by DTO mapping. */
    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setBarcode("779");
        return product;
    }

    /** Creates a supplier with fields used by DTO mapping. */
    private Supplier supplier(Long id, String name) {
        Supplier supplier = new Supplier();
        supplier.setId(id);
        supplier.setName(name);
        return supplier;
    }

    /** Creates a supplier-product association. */
    private SupplierProduct supplierProduct(Long id, Supplier supplier, Product product, BigDecimal cost) {
        SupplierProduct supplierProduct = new SupplierProduct();
        supplierProduct.setId(id);
        supplierProduct.setSupplier(supplier);
        supplierProduct.setProduct(product);
        supplierProduct.setCurrentCost(cost);
        supplierProduct.setSupplierSku("SKU-1");
        return supplierProduct;
    }

    /** Creates a branch mock because branch entities are read-only outside JPA. */
    private Branch branch(Long id, String name) {
        Branch branch = mock(Branch.class);
        lenient().when(branch.getId()).thenReturn(id);
        lenient().when(branch.getName()).thenReturn(name);
        lenient().when(branch.isActive()).thenReturn(true);
        return branch;
    }
}
