package com.dietetica.lembas.suppliers.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PurchaseReceiptEntryCommand;
import com.dietetica.lembas.inventory.api.PurchaseReceiptEntryRequest;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.PurchaseReceipt;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptItemRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptRepository;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Unit tests for purchase receipt confirmation and stock generation. */
@ExtendWith(MockitoExtension.class)
class PurchaseReceiptServiceTest {
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseReceiptRepository purchaseReceiptRepository;

    @Mock
    private PurchaseReceiptItemRepository purchaseReceiptItemRepository;

    @Mock
    private PurchaseReceiptEntryCommand purchaseReceiptEntryCommand;

    @Mock
    private SecurityContextHelper securityContextHelper;

    private PurchaseReceiptService service;

    @BeforeEach
    void setUp() {
        service = new PurchaseReceiptService(
                purchaseOrderRepository,
                purchaseReceiptRepository,
                purchaseReceiptItemRepository,
                purchaseReceiptEntryCommand,
                securityContextHelper);
        lenient().when(securityContextHelper.getCurrentUser()).thenThrow(new IllegalStateException("No user"));
    }

    @Test
    void confirmShouldCreateReceiptStockEntryAndMarkOrderReceived() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        PurchaseReceiptRequest request = receiptRequest(BigDecimal.valueOf(5));
        User currentUser = mock(User.class);
        when(currentUser.getId()).thenReturn(40L);
        doReturn(currentUser).when(securityContextHelper).getCurrentUser();
        when(purchaseOrderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L))
                .thenReturn(BigDecimal.ZERO, BigDecimal.valueOf(5));
        when(purchaseReceiptRepository.saveAndFlush(any(PurchaseReceipt.class))).thenAnswer(invocation -> {
            PurchaseReceipt receipt = invocation.getArgument(0);
            receipt.setId(50L);
            receipt.getItems().getFirst().setId(60L);
            return receipt;
        });
        when(purchaseReceiptEntryCommand.createPurchaseReceiptEntry(any())).thenReturn(70L);

        var result = service.confirm(request);

        ArgumentCaptor<PurchaseReceiptEntryRequest> entryCaptor =
                ArgumentCaptor.forClass(PurchaseReceiptEntryRequest.class);
        verify(purchaseReceiptEntryCommand).createPurchaseReceiptEntry(entryCaptor.capture());
        PurchaseReceiptEntryRequest entry = entryCaptor.getValue();
        assertThat(entry.supplierId()).isEqualTo(30L);
        assertThat(entry.purchaseReceiptId()).isEqualTo(50L);
        assertThat(entry.purchaseReceiptItemId()).isEqualTo(60L);
        assertThat(entry.productId()).isEqualTo(10L);
        assertThat(entry.branchId()).isEqualTo(20L);
        assertThat(entry.receivedByUserId()).isEqualTo(40L);
        assertThat(entry.quantity()).isEqualByComparingTo("5");
        assertThat(entry.unitCost()).isEqualByComparingTo("1200");
        assertThat(entry.lotCode()).isEqualTo("L-1");

        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(result.purchaseOrderStatus()).isEqualTo("RECEIVED");
        assertThat(result.items().getFirst().createdStockLotId()).isEqualTo(70L);
    }

    @Test
    void confirmShouldMarkOrderPartiallyReceivedWhenQuantityIsIncomplete() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        PurchaseReceiptRequest request = receiptRequest(BigDecimal.valueOf(2));
        when(purchaseOrderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L))
                .thenReturn(BigDecimal.ZERO, BigDecimal.valueOf(2));
        when(purchaseReceiptRepository.saveAndFlush(any(PurchaseReceipt.class))).thenAnswer(invocation -> {
            PurchaseReceipt receipt = invocation.getArgument(0);
            receipt.setId(50L);
            receipt.getItems().getFirst().setId(60L);
            return receipt;
        });
        when(purchaseReceiptEntryCommand.createPurchaseReceiptEntry(any())).thenReturn(70L);

        var result = service.confirm(request);

        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        assertThat(result.purchaseOrderStatus()).isEqualTo("PARTIALLY_RECEIVED");
    }

    @Test
    void confirmShouldRejectOverReceivedQuantity() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        when(purchaseOrderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L))
                .thenReturn(BigDecimal.valueOf(4));

        assertThatThrownBy(() -> service.confirm(receiptRequest(BigDecimal.valueOf(2))))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PURCHASE_RECEIPT_OVER_RECEIVED");

        verify(purchaseReceiptRepository, never()).saveAndFlush(any());
        verify(purchaseReceiptEntryCommand, never()).createPurchaseReceiptEntry(any());
    }

    @Test
    void confirmShouldRejectOrdersThatAreNotSent() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        order.setStatus(PurchaseOrderStatus.CONFIRMED);
        when(purchaseOrderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.confirm(receiptRequest(BigDecimal.ONE)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PURCHASE_RECEIPT_INVALID_STATE");
    }

    /** Builds a sent purchase order with one product line. */
    private PurchaseOrder sentOrder(BigDecimal orderedQuantity) {
        Product product = new Product();
        product.setId(10L);
        product.setName("Granola");

        Supplier supplier = new Supplier();
        supplier.setId(30L);
        supplier.setName("Proveedor");

        Branch branch = mock(Branch.class);
        lenient().when(branch.getId()).thenReturn(20L);
        lenient().when(branch.getName()).thenReturn("Centro");

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId(100L);
        item.setProduct(product);
        item.setQuantityOrdered(orderedQuantity);
        item.setUnitCost(BigDecimal.valueOf(1000));

        PurchaseOrder order = new PurchaseOrder();
        order.setId(1L);
        order.setSupplier(supplier);
        order.setBranch(branch);
        order.setStatus(PurchaseOrderStatus.SENT);
        order.addItem(item);
        return order;
    }

    /** Builds a receipt request for the default order item. */
    private PurchaseReceiptRequest receiptRequest(BigDecimal quantity) {
        return new PurchaseReceiptRequest(
                1L,
                "FAC-1",
                "Llegaron cajas cerradas",
                List.of(new PurchaseReceiptItemRequest(
                        100L,
                        quantity,
                        BigDecimal.valueOf(1200),
                        "L-1",
                        LocalDate.now().plusDays(30))));
    }
}
