package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.inventory.dto.StockAdjustmentRequest;
import com.dietetica.lembas.inventory.dto.StockMovementDto;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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

/** Unit tests for stock lot entry use cases in {@link InventoryService}. */
@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private StockLotRepository stockLotRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private FefoStockDeductionPolicy fefoPolicy;

    @Mock
    private SecurityContextHelper securityContextHelper;

    private final Clock clock = Clock.fixed(Instant.parse("2026-06-04T12:00:00Z"), ZoneOffset.UTC);

    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(
                stockLotRepository,
                stockMovementRepository,
                productRepository,
                branchRepository,
                orderRepository,
                fefoPolicy,
                securityContextHelper,
                clock
        );
    }

    @Test
    void createStockLotShouldPersistLotAndPurchaseEntryMovement() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        CreateStockLotRequest request = new CreateStockLotRequest(
                10L, 20L, BigDecimal.valueOf(3.5), " L-001 ", LocalDate.now().plusDays(30), BigDecimal.valueOf(500));
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(stockLotRepository.calculateAvailableQuantity(10L, 20L)).thenReturn(BigDecimal.valueOf(8.5));

        var result = inventoryService.createStockLot(request);

        ArgumentCaptor<StockLot> lotCaptor = ArgumentCaptor.forClass(StockLot.class);
        verify(stockLotRepository).save(lotCaptor.capture());
        StockLot savedLot = lotCaptor.getValue();
        assertThat(savedLot.getProduct()).isSameAs(product);
        assertThat(savedLot.getBranch()).isSameAs(branch);
        assertThat(savedLot.getInitialQuantity()).isEqualByComparingTo("3.5");
        assertThat(savedLot.getQuantityAvailable()).isEqualByComparingTo("3.5");
        assertThat(savedLot.getUnitCost()).isEqualByComparingTo("500");
        assertThat(savedLot.getLotCode()).isEqualTo("L-001");

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.PURCHASE_ENTRY);
        assertThat(movement.getQuantity()).isEqualByComparingTo("3.5");
        assertThat(movement.getUnitCostSnapshot()).isEqualByComparingTo("500");
        assertThat(movement.getReferenceType()).isEqualTo("STOCK_LOT");
        assertThat(movement.getProduct()).isSameAs(product);
        assertThat(movement.getBranch()).isSameAs(branch);
        assertThat(movement.getStockLot()).isSameAs(savedLot);

        assertThat(result.totalAvailableForProductBranch()).isEqualByComparingTo("8.5");
    }

    @Test
    void createStockLotShouldFailWhenProductDoesNotExist() {
        CreateStockLotRequest request = new CreateStockLotRequest(999L, 20L, BigDecimal.ONE, null, null, null);
        when(productRepository.findByIdAndActiveTrue(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.createStockLot(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRODUCT_NOT_FOUND");

        verify(stockLotRepository, never()).save(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void createStockLotShouldFailWhenBranchDoesNotExistOrIsInactive() {
        Product product = product(10L, "Granola");
        CreateStockLotRequest request = new CreateStockLotRequest(10L, 20L, BigDecimal.ONE, null, null, null);
        Branch inactiveBranch = branch(20L, "Centro", false);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(inactiveBranch));

        assertThatThrownBy(() -> inventoryService.createStockLot(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("BRANCH_NOT_FOUND");

        verify(stockLotRepository, never()).save(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void deductStockShouldCallPolicyAndUpdateLots() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(1L, "10.000");
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(1L, BigDecimal.valueOf(4), BigDecimal.valueOf(10), BigDecimal.valueOf(6))),
                BigDecimal.valueOf(4), BigDecimal.valueOf(10), true
        );
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(4))).thenReturn(plan);
        when(stockLotRepository.findById(1L)).thenReturn(Optional.of(lot));

        DeductionPlan result = inventoryService.deductStock(10L, 20L, BigDecimal.valueOf(4), StockMovementType.POS_SALE);

        assertThat(result.entries()).hasSize(1);
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("6");
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.POS_SALE);
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("-4");
        verify(stockLotRepository).flush();
    }

    @Test
    void deductStockShouldThrowWhenProductNotFound() {
        when(productRepository.findByIdAndActiveTrue(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.deductStock(999L, 20L, BigDecimal.ONE, StockMovementType.POS_SALE))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRODUCT_NOT_FOUND");

        verify(stockLotRepository, never()).findAvailableLotsForUpdate(any(), any());
    }

    @Test
    void deductStockShouldThrowWhenBranchNotFound() {
        Product product = product(10L, "Granola");
        Branch inactive = branch(20L, "Centro", false);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> inventoryService.deductStock(10L, 20L, BigDecimal.ONE, StockMovementType.POS_SALE))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("BRANCH_NOT_FOUND");

        verify(stockLotRepository, never()).findAvailableLotsForUpdate(any(), any());
    }

    @Test
    void deductStockShouldUseOnlineSaleType() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(1L, "5.000");
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(1L, BigDecimal.valueOf(3), BigDecimal.valueOf(5), BigDecimal.valueOf(2))),
                BigDecimal.valueOf(3), BigDecimal.valueOf(5), true
        );
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(3))).thenReturn(plan);
        when(stockLotRepository.findById(1L)).thenReturn(Optional.of(lot));

        inventoryService.deductStock(10L, 20L, BigDecimal.valueOf(3), StockMovementType.ONLINE_SALE);

        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.ONLINE_SALE);
    }

    @Test
    void deductStockShouldDepleteLotWhenQuantityReachesZero() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(1L, "5.000");
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(1L, BigDecimal.valueOf(5), BigDecimal.valueOf(5), BigDecimal.valueOf(0))),
                BigDecimal.valueOf(5), BigDecimal.valueOf(5), true
        );
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(5))).thenReturn(plan);
        when(stockLotRepository.findById(1L)).thenReturn(Optional.of(lot));

        inventoryService.deductStock(10L, 20L, BigDecimal.valueOf(5), StockMovementType.POS_SALE);

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("0");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.DEPLETED);
    }

    @Test
    void deductStockShouldPropagateInsufficientStockFromPolicy() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(1L, "3.000");
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(5)))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, ""));

        assertThatThrownBy(() -> inventoryService.deductStock(10L, 20L, BigDecimal.valueOf(5), StockMovementType.POS_SALE))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_STOCK");

        verify(stockMovementRepository, never()).save(any());
    }

    // ---------------------------------------------------------------------------
    // adjustStock tests
    // ---------------------------------------------------------------------------

    @Test
    void adjustStock_positive_noLot_createsNewLotAndMovement() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(5), "Correccion inventario", StockMovementType.MANUAL_ADJUSTMENT, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        inventoryService.adjustStock(request);

        ArgumentCaptor<StockLot> lotCaptor = ArgumentCaptor.forClass(StockLot.class);
        verify(stockLotRepository).save(lotCaptor.capture());
        StockLot savedLot = lotCaptor.getValue();
        assertThat(savedLot.getQuantityAvailable()).isEqualByComparingTo("5");
        assertThat(savedLot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);

        ArgumentCaptor<StockMovement> movCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movCaptor.capture());
        StockMovement movement = movCaptor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.MANUAL_ADJUSTMENT);
        assertThat(movement.getQuantity()).isEqualByComparingTo("5");
        assertThat(movement.getReason()).isEqualTo("Correccion inventario");
        assertThat(movement.getCreatedByUserId()).isEqualTo(100L);
        assertThat(movement.getReferenceType()).isEqualTo("STOCK_ADJUSTMENT");
    }

    @Test
    void adjustStock_negative_fefo_deductsUsingDeductionPolicy() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockLot lot = lot(1L, "10.000");
        lot.setProduct(product);
        lot.setBranch(branch);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(-4), "Merma", StockMovementType.WASTE, null);
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(1L, BigDecimal.valueOf(4), BigDecimal.valueOf(10), BigDecimal.valueOf(6))),
                BigDecimal.valueOf(4), BigDecimal.valueOf(10), true);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(4))).thenReturn(plan);
        when(stockLotRepository.findById(1L)).thenReturn(Optional.of(lot));

        inventoryService.adjustStock(request);

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("6");
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.WASTE);
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("-4");
        assertThat(captor.getValue().getCreatedByUserId()).isEqualTo(100L);
        assertThat(captor.getValue().getReason()).isEqualTo("Merma");
    }

    @Test
    void adjustStock_reasonEmpty_throws() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(5), "   ", StockMovementType.MANUAL_ADJUSTMENT, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> inventoryService.adjustStock(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ADJUSTMENT_REASON_REQUIRED");

        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void adjustStock_quantityZero_throws() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.ZERO, "Ajuste", StockMovementType.MANUAL_ADJUSTMENT, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> inventoryService.adjustStock(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ADJUSTMENT_QUANTITY_ZERO");

        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void adjustStock_invalidType_throws() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(5), "Test", StockMovementType.POS_SALE, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> inventoryService.adjustStock(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_ADJUSTMENT_TYPE");

        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void adjustStock_negative_insufficientStock_throws() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockLot lot = lot(1L, "3.000");
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(-5), "Merma", StockMovementType.WASTE, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.findAvailableLotsForUpdate(10L, 20L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(List.of(lot), BigDecimal.valueOf(5)))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, ""));

        assertThatThrownBy(() -> inventoryService.adjustStock(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_STOCK");

        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void adjustStock_positive_specificLot_incrementsThatLot() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockLot lot = lot(1L, "10.000");
        lot.setProduct(product);
        lot.setBranch(branch);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(3), "Correccion", StockMovementType.MANUAL_ADJUSTMENT, 1L);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(lot));

        inventoryService.adjustStock(request);

        verify(stockLotRepository).findByIdForUpdate(1L);
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("13");
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("3");
    }

    @Test
    void adjustStock_negative_specificLot_deductsFromThatLot() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockLot lot = lot(1L, "10.000");
        lot.setProduct(product);
        lot.setBranch(branch);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(-4), "Consumo interno", StockMovementType.INTERNAL_CONSUMPTION, 1L);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(lot));

        inventoryService.adjustStock(request);

        verify(stockLotRepository).findByIdForUpdate(1L);
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("6");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.INTERNAL_CONSUMPTION);
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("-4");
    }

    @Test
    void adjustStock_positive_specificDepletedLot_reactivatesThatLot() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        User user = user(100L);
        StockLot lot = lot(1L, "0.000");
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setStatus(StockLotStatus.DEPLETED);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(2), "Reconteo", StockMovementType.MANUAL_ADJUSTMENT, 1L);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(stockLotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(lot));

        inventoryService.adjustStock(request);

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("2");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
    }

    @Test
    void adjustStock_positiveWaste_throwsInvalidSign() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockAdjustmentRequest request = new StockAdjustmentRequest(
                10L, 20L, BigDecimal.valueOf(2), "Merma", StockMovementType.WASTE, null);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> inventoryService.adjustStock(request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_ADJUSTMENT_SIGN");

        verify(stockMovementRepository, never()).save(any());
    }

    // ----------------------------------------------------------------
    // reverseMovementsForOrder
    // ----------------------------------------------------------------

    @Test
    void reverseMovementsForOrder_noSaleMovements_returnsZero() {
        when(stockMovementRepository.findSaleMovementsByOrderId(1L)).thenReturn(List.of());

        int reversed = inventoryService.reverseMovementsForOrder(1L);

        assertThat(reversed).isZero();
        verify(stockLotRepository, never()).findByIdForUpdate(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void reverseMovementsForOrder_existingMovements_creditsLotsAndRecordsReturn() {
        Product product = product(10L, "Yerba");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot1 = lot(100L, "2.0");
        lot1.setStatus(StockLotStatus.DEPLETED);
        StockLot lot2 = lot(101L, "0.0");
        lot2.setStatus(StockLotStatus.DEPLETED);
        StockMovement sale1 = saleMovement(500L, lot1, product, branch, new BigDecimal("-3.0"), 1L);
        StockMovement sale2 = saleMovement(501L, lot2, product, branch, new BigDecimal("-1.5"), 1L);
        when(stockMovementRepository.findSaleMovementsByOrderId(1L)).thenReturn(List.of(sale1, sale2));
        when(stockLotRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(lot1));
        when(stockLotRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(lot2));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        int reversed = inventoryService.reverseMovementsForOrder(1L);

        assertThat(reversed).isEqualTo(2);
        assertThat(lot1.getQuantityAvailable()).isEqualByComparingTo("5.0");
        assertThat(lot1.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
        assertThat(lot2.getQuantityAvailable()).isEqualByComparingTo("1.5");
        assertThat(lot2.getStatus()).isEqualTo(StockLotStatus.ACTIVE);

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, org.mockito.Mockito.times(2)).save(movementCaptor.capture());
        List<StockMovement> saved = movementCaptor.getAllValues();
        assertThat(saved).hasSize(2);
        assertThat(saved.get(0).getType()).isEqualTo(StockMovementType.CANCELLATION_RETURN);
        assertThat(saved.get(0).getQuantity()).isEqualByComparingTo("3.0");
        assertThat(saved.get(0).getOrderId()).isEqualTo(1L);
        assertThat(saved.get(0).getReferenceType()).isEqualTo("ORDER");
        assertThat(saved.get(1).getType()).isEqualTo(StockMovementType.CANCELLATION_RETURN);
        assertThat(saved.get(1).getQuantity()).isEqualByComparingTo("1.5");
    }

    @Test
    void reverseMovementsForOrder_keepsActiveStatusWhenLotStillHasStock() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(100L, "7.0");
        lot.setStatus(StockLotStatus.ACTIVE);
        StockMovement sale = saleMovement(500L, lot, product, branch, new BigDecimal("-2.0"), 1L);
        when(stockMovementRepository.findSaleMovementsByOrderId(1L)).thenReturn(List.of(sale));
        when(stockLotRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(lot));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        inventoryService.reverseMovementsForOrder(1L);

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("9.0");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
    }

    @Test
    void reverseMovementsForOrder_missingLot_throwsNotFound() {
        Product product = product(10L, "Yerba");
        Branch branch = branch(20L, "Centro", true);
        StockLot lot = lot(100L, "0.0");
        StockMovement sale = saleMovement(500L, lot, product, branch, new BigDecimal("-3.0"), 1L);
        when(stockMovementRepository.findSaleMovementsByOrderId(1L)).thenReturn(List.of(sale));
        when(stockLotRepository.findByIdForUpdate(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.reverseMovementsForOrder(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("STOCK_LOT_NOT_FOUND");
    }

    /** Builds a stock movement matching the shape used by deductForOnlineOrder. */
    private StockMovement saleMovement(Long id, StockLot lot, Product product, Branch branch,
                                       BigDecimal quantity, Long orderId) {
        StockMovement movement = new StockMovement();
        movement.setId(id);
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(StockMovementType.ONLINE_SALE);
        movement.setQuantity(quantity);
        movement.setOrderId(orderId);
        movement.setUnitCostSnapshot(lot.getUnitCost());
        return movement;
    }

    /** Creates a product with the minimum fields required by the service. */
    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        return product;
    }

    /** Creates a branch mock because production branch entities are read-only outside JPA. */
    private Branch branch(Long id, String name, boolean active) {
        Branch branch = mock(Branch.class);
        lenient().when(branch.getId()).thenReturn(id);
        lenient().when(branch.getName()).thenReturn(name);
        lenient().when(branch.isActive()).thenReturn(active);
        return branch;
    }

    /** Creates a stock lot with the minimum fields required by deduction tests. */
    private StockLot lot(Long id, String quantityAvailable) {
        StockLot lot = new StockLot();
        lot.setId(id);
        lot.setQuantityAvailable(new BigDecimal(quantityAvailable));
        lot.setStatus(StockLotStatus.ACTIVE);
        lot.setUnitCost(BigDecimal.valueOf(500));
        return lot;
    }

    /** Creates a minimal user mock with the given id. */
    private User user(Long id) {
        User user = mock(User.class);
        lenient().when(user.getId()).thenReturn(id);
        lenient().when(user.getRole()).thenReturn(Role.ADMIN);
        return user;
    }
}
