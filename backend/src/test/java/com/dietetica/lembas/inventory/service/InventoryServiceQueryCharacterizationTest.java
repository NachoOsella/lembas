package com.dietetica.lembas.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.dto.StockMovementDto;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/** Characterization tests for inventory branch scoping and API query mappings. */
@ExtendWith(MockitoExtension.class)
class InventoryServiceQueryCharacterizationTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-06-04T12:00:00Z"), ZoneOffset.UTC);

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
                CLOCK);
    }

    @Test
    void createStockLotScopesEmployeeRequestsToTheirAssignedBranch() {
        Product product = product(10L, "Granola");
        Branch assignedBranch = branch(20L, "Centro");
        when(assignedBranch.isActive()).thenReturn(true);
        User employee = user(Role.EMPLOYEE, 20L);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(productRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(product));
        when(branchRepository.findById(20L)).thenReturn(Optional.of(assignedBranch));
        when(stockLotRepository.save(any(StockLot.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(stockLotRepository.calculateAvailableQuantity(10L, 20L)).thenReturn(BigDecimal.valueOf(5));

        StockLotDto result = inventoryService.createStockLot(
                new CreateStockLotRequest(10L, 99L, BigDecimal.valueOf(5), "  LOT-1  ", null, null));

        ArgumentCaptor<StockLot> lotCaptor = ArgumentCaptor.forClass(StockLot.class);
        verify(stockLotRepository).save(lotCaptor.capture());
        assertThat(lotCaptor.getValue().getBranch()).isSameAs(assignedBranch);
        assertThat(lotCaptor.getValue().getLotCode()).isEqualTo("LOT-1");
        assertThat(lotCaptor.getValue().getInitialQuantity()).isEqualByComparingTo("5");
        assertThat(lotCaptor.getValue().getQuantityAvailable()).isEqualByComparingTo("5");
        assertThat(lotCaptor.getValue().getUnitCost()).isEqualByComparingTo("0");
        verify(branchRepository).findById(20L);
        verify(branchRepository, never()).findById(99L);
        assertThat(result.branchId()).isEqualTo(20L);
        assertThat(result.totalAvailableForProductBranch()).isEqualByComparingTo("5");
    }

    @Test
    void listLotsScopesEmployeeQueriesAndMapsLotEntitiesToDtos() {
        Product product = product(10L, "Granola");
        Branch assignedBranch = branch(20L, "Centro");
        StockLot lot = new StockLot();
        lot.setId(1L);
        lot.setProduct(product);
        lot.setBranch(assignedBranch);
        lot.setInitialQuantity(BigDecimal.valueOf(8));
        lot.setQuantityAvailable(BigDecimal.valueOf(3));
        lot.setLotCode("LOT-1");
        lot.setExpirationDate(LocalDate.of(2026, 7, 1));
        lot.setCostPrice(BigDecimal.valueOf(500));
        lot.setUnitCost(BigDecimal.valueOf(550));
        lot.setStatus(StockLotStatus.ACTIVE);
        lot.setSupplierId(30L);
        lot.setSupplierProductId(31L);
        lot.setPurchaseReceiptId(40L);
        lot.setPurchaseReceiptItemId(41L);
        Pageable requestedPage = PageRequest.of(0, 10, Sort.by("productName").ascending());
        User employee = user(Role.EMPLOYEE, 20L);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(stockLotRepository.searchLots(
                        eq("%granola%"),
                        eq(10L),
                        eq(20L),
                        eq(false),
                        eq(LocalDate.of(2026, 7, 4)),
                        any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(lot), requestedPage, 1));

        var page = inventoryService.listLots("  GRANOLA ", 10L, 99L, false, requestedPage);

        assertThat(page.getContent())
                .containsExactly(new StockLotDto(
                        1L,
                        10L,
                        "Granola",
                        20L,
                        "Centro",
                        BigDecimal.valueOf(8),
                        BigDecimal.valueOf(3),
                        "LOT-1",
                        LocalDate.of(2026, 7, 1),
                        BigDecimal.valueOf(500),
                        BigDecimal.valueOf(550),
                        "ACTIVE",
                        30L,
                        31L,
                        40L,
                        41L,
                        null));
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(stockLotRepository)
                .searchLots(
                        eq("%granola%"),
                        eq(10L),
                        eq(20L),
                        eq(false),
                        eq(LocalDate.of(2026, 7, 4)),
                        pageableCaptor.capture());
        assertThat(pageableCaptor
                        .getValue()
                        .getSort()
                        .getOrderFor("product.name")
                        .getDirection())
                .isEqualTo(Sort.Direction.ASC);
    }

    @Test
    void listMovementsMapsTheReadModelWithoutExposingEntities() {
        Product product = product(10L, "Granola");
        Branch branch = branch(20L, "Centro");
        StockLot lot = new StockLot();
        lot.setId(1L);
        StockMovement movement = new StockMovement();
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-06-04T12:30:00Z");
        movement.setId(2L);
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(StockMovementType.WASTE);
        movement.setQuantity(BigDecimal.valueOf(-2));
        movement.setUnitCostSnapshot(BigDecimal.valueOf(500));
        movement.setReason("Damaged package");
        movement.setCreatedByUserId(100L);
        movement.setCreatedAt(createdAt);
        User admin = mock(User.class);
        when(admin.getRole()).thenReturn(Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(stockMovementRepository.findAll(
                        org.mockito.ArgumentMatchers.<Specification<StockMovement>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(movement), PageRequest.of(0, 10), 1));

        var page = inventoryService.listMovements(
                StockMovementType.WASTE,
                10L,
                20L,
                " Granola ",
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 4),
                PageRequest.of(0, 10));

        assertThat(page.getContent())
                .containsExactly(new StockMovementDto(
                        2L,
                        1L,
                        10L,
                        "Granola",
                        20L,
                        "Centro",
                        "WASTE",
                        BigDecimal.valueOf(-2),
                        BigDecimal.valueOf(500),
                        "Damaged package",
                        100L,
                        createdAt));
    }

    @Test
    void listLotsRejectsBranchScopedUsersWithoutAnAssignedBranch() {
        User employeeWithoutBranch = user(Role.EMPLOYEE, null);
        when(securityContextHelper.getCurrentUser()).thenReturn(employeeWithoutBranch);

        assertThatThrownBy(() -> inventoryService.listLots(null, null, 20L, false, PageRequest.of(0, 10)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_USER_BRANCH");

        verifyNoInteractions(stockLotRepository);
    }

    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        return product;
    }

    private Branch branch(Long id, String name) {
        Branch branch = mock(Branch.class);
        when(branch.getId()).thenReturn(id);
        when(branch.getName()).thenReturn(name);
        return branch;
    }

    private User user(Role role, Long branchId) {
        User user = mock(User.class);
        when(user.getRole()).thenReturn(role);
        when(user.getBranchId()).thenReturn(branchId);
        return user;
    }
}
