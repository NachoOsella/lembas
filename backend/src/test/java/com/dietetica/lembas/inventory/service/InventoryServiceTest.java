package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
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

    private final Clock clock = Clock.fixed(Instant.parse("2026-06-04T12:00:00Z"), ZoneOffset.UTC);

    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(
                stockLotRepository,
                stockMovementRepository,
                productRepository,
                branchRepository,
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
        assertThat(savedLot.getQuantityAvailable()).isEqualByComparingTo("3.5");
        assertThat(savedLot.getLotCode()).isEqualTo("L-001");

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.PURCHASE_ENTRY);
        assertThat(movement.getQuantity()).isEqualByComparingTo("3.5");
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
        when(branch.isActive()).thenReturn(active);
        return branch;
    }
}
