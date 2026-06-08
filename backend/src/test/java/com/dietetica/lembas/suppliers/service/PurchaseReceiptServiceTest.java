package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.PurchaseReceipt;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptItemRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptRepository;
import com.dietetica.lembas.suppliers.model.Supplier;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
    private StockLotRepository stockLotRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private SecurityContextHelper securityContextHelper;

    private PurchaseReceiptService service;

    @BeforeEach
    void setUp() {
        service = new PurchaseReceiptService(
                purchaseOrderRepository,
                purchaseReceiptRepository,
                purchaseReceiptItemRepository,
                stockLotRepository,
                stockMovementRepository,
                securityContextHelper
        );
        lenient().when(securityContextHelper.getCurrentUser()).thenThrow(new IllegalStateException("No user"));
    }

    @Test
    void confirmShouldCreateReceiptLotMovementAndMarkOrderReceived() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        PurchaseReceiptRequest request = receiptRequest(BigDecimal.valueOf(5));
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L))
                .thenReturn(BigDecimal.ZERO, BigDecimal.valueOf(5));
        when(purchaseReceiptRepository.saveAndFlush(any(PurchaseReceipt.class))).thenAnswer(invocation -> {
            PurchaseReceipt receipt = invocation.getArgument(0);
            receipt.setId(50L);
            receipt.getItems().getFirst().setId(60L);
            return receipt;
        });
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> {
            StockLot lot = invocation.getArgument(0);
            lot.setId(70L);
            return lot;
        });

        var result = service.confirm(request);

        ArgumentCaptor<StockLot> lotCaptor = ArgumentCaptor.forClass(StockLot.class);
        verify(stockLotRepository).save(lotCaptor.capture());
        StockLot lot = lotCaptor.getValue();
        assertThat(lot.getPurchaseReceiptId()).isEqualTo(50L);
        assertThat(lot.getPurchaseReceiptItemId()).isEqualTo(60L);
        assertThat(lot.getInitialQuantity()).isEqualByComparingTo("5");
        assertThat(lot.getUnitCost()).isEqualByComparingTo("1200");

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.PURCHASE_ENTRY);
        assertThat(movement.getReferenceType()).isEqualTo("PURCHASE_RECEIPT_ITEM");
        assertThat(movement.getReferenceId()).isEqualTo(60L);

        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(result.purchaseOrderStatus()).isEqualTo("RECEIVED");
        assertThat(result.items().getFirst().createdStockLotId()).isEqualTo(70L);
    }

    @Test
    void confirmShouldMarkOrderPartiallyReceivedWhenQuantityIsIncomplete() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        PurchaseReceiptRequest request = receiptRequest(BigDecimal.valueOf(2));
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L))
                .thenReturn(BigDecimal.ZERO, BigDecimal.valueOf(2));
        when(purchaseReceiptRepository.saveAndFlush(any(PurchaseReceipt.class))).thenAnswer(invocation -> {
            PurchaseReceipt receipt = invocation.getArgument(0);
            receipt.setId(50L);
            receipt.getItems().getFirst().setId(60L);
            return receipt;
        });
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> {
            StockLot lot = invocation.getArgument(0);
            lot.setId(70L);
            return lot;
        });

        var result = service.confirm(request);

        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        assertThat(result.purchaseOrderStatus()).isEqualTo("PARTIALLY_RECEIVED");
    }

    @Test
    void confirmShouldRejectOverReceivedQuantity() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(100L)).thenReturn(BigDecimal.valueOf(4));

        assertThatThrownBy(() -> service.confirm(receiptRequest(BigDecimal.valueOf(2))))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PURCHASE_RECEIPT_OVER_RECEIVED");

        verify(purchaseReceiptRepository, never()).saveAndFlush(any());
        verify(stockLotRepository, never()).save(any());
    }

    @Test
    void confirmShouldRejectOrdersThatAreNotSent() {
        PurchaseOrder order = sentOrder(BigDecimal.valueOf(5));
        order.setStatus(PurchaseOrderStatus.CONFIRMED);
        when(purchaseOrderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

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
                List.of(new PurchaseReceiptItemRequest(100L, quantity, BigDecimal.valueOf(1200), "L-1", LocalDate.now().plusDays(30)))
        );
    }
}
