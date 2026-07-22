package com.dietetica.lembas.inventory.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PurchaseReceiptEntryRequest;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** Unit tests for inventory-owned stock creation from confirmed purchase receipt items. */
class PurchaseReceiptEntryServiceTest {

    private final StockLotRepository stockLotRepository = mock(StockLotRepository.class);
    private final StockMovementRepository stockMovementRepository = mock(StockMovementRepository.class);
    private final ProductLookup productLookup = mock(ProductLookup.class);
    private final BranchQuery branchQuery = mock(BranchQuery.class);
    private final PurchaseReceiptEntryService service =
            new PurchaseReceiptEntryService(stockLotRepository, stockMovementRepository, productLookup, branchQuery);

    @Test
    void createPurchaseReceiptEntryShouldPersistTraceableLotAndMovement() {
        Product product = new Product();
        product.setId(10L);
        Branch branch = mock(Branch.class);
        PurchaseReceiptEntryRequest request = new PurchaseReceiptEntryRequest(
                20L,
                21L,
                30L,
                31L,
                10L,
                40L,
                50L,
                new BigDecimal("5.000"),
                new BigDecimal("12.50"),
                " LOT-1 ",
                LocalDate.of(2030, 1, 1));

        when(productLookup.findById(10L)).thenReturn(Optional.of(product));
        when(branchQuery.findById(40L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> {
            StockLot lot = invocation.getArgument(0);
            lot.setId(60L);
            return lot;
        });

        Long lotId = service.createPurchaseReceiptEntry(request);

        ArgumentCaptor<StockLot> lotCaptor = ArgumentCaptor.forClass(StockLot.class);
        verify(stockLotRepository).save(lotCaptor.capture());
        StockLot lot = lotCaptor.getValue();
        assertThat(lot.getProduct()).isSameAs(product);
        assertThat(lot.getBranch()).isSameAs(branch);
        assertThat(lot.getInitialQuantity()).isEqualByComparingTo("5.000");
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("5.000");
        assertThat(lot.getSupplierId()).isEqualTo(20L);
        assertThat(lot.getSupplierProductId()).isEqualTo(21L);
        assertThat(lot.getPurchaseReceiptId()).isEqualTo(30L);
        assertThat(lot.getPurchaseReceiptItemId()).isEqualTo(31L);
        assertThat(lot.getLotCode()).isEqualTo("LOT-1");
        assertThat(lot.getExpirationDate()).isEqualTo(LocalDate.of(2030, 1, 1));
        assertThat(lot.getCostPrice()).isEqualByComparingTo("12.50");
        assertThat(lot.getUnitCost()).isEqualByComparingTo("12.50");

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getStockLot()).isSameAs(lot);
        assertThat(movement.getProduct()).isSameAs(product);
        assertThat(movement.getBranch()).isSameAs(branch);
        assertThat(movement.getType()).isEqualTo(StockMovementType.PURCHASE_ENTRY);
        assertThat(movement.getQuantity()).isEqualByComparingTo("5.000");
        assertThat(movement.getUnitCostSnapshot()).isEqualByComparingTo("12.50");
        assertThat(movement.getReferenceType()).isEqualTo("PURCHASE_RECEIPT_ITEM");
        assertThat(movement.getReferenceId()).isEqualTo(31L);
        assertThat(movement.getCreatedByUserId()).isEqualTo(50L);
        assertThat(movement.getReason()).isEqualTo("Purchase receipt confirmation");
        assertThat(lotId).isEqualTo(60L);
    }
}
