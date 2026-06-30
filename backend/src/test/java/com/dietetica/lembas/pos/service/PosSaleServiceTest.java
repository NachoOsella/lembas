package com.dietetica.lembas.pos.service;

import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.orders.service.OrderMapper;
import com.dietetica.lembas.orders.service.OrderNumberGenerator;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PosSaleService}.
 *
 * <p>Verifies the transactional POS sale flow: open cash session, FEFO stock
 * deduction, order + items + payment persistence, and the documented error
 * codes raised on every invalid input.</p>
 */
@ExtendWith(MockitoExtension.class)
class PosSaleServiceTest {

    @Mock private CashService cashService;
    @Mock private ProductRepository productRepository;
    @Mock private StockLotRepository stockLotRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private FefoStockDeductionPolicy fefoPolicy;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderNumberGenerator orderNumberGenerator;
    @Mock private OrderMapper orderMapper;
    @Mock private BranchRepository branchRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PosSaleService service;

    private static final Long BRANCH_ID = 1L;
    private static final Long SESSION_ID = 10L;
    private static final Long PRODUCT_ID = 100L;

    @BeforeEach
    void setUp() {
        service = new PosSaleService(
                cashService, productRepository, stockLotRepository,
                stockMovementRepository, fefoPolicy, orderRepository,
                orderNumberGenerator, orderMapper, branchRepository, objectMapper);
    }

    // ---------------------------------------------------------------------------
    // Happy path
    // ---------------------------------------------------------------------------

    @Test
    void createSale_persistsOrderPaymentAndMovements() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "Aceite", new BigDecimal("2500.00"));
        StockLot lot = stockLot(1L, new BigDecimal("10"));
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionPlan.DeductionEntry(1L, new BigDecimal("3"), new BigDecimal("10"), new BigDecimal("7"))),
                BigDecimal.valueOf(3), BigDecimal.valueOf(10), true);

        stubHappyPath(cashier, branch, product, lot, plan);

        OrderDetailDto expected = orderDetailDto();
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(expected);

        OrderDetailDto result = service.createSale(saleRequest(PRODUCT_ID, 3, PaymentMethod.CASH), cashier);

        assertThat(result).isSameAs(expected);
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("7");
        verify(stockMovementRepository, times(1)).save(any(StockMovement.class));
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    void createSale_mergesDuplicateItems() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "Aceite", new BigDecimal("100.00"));
        StockLot lot = stockLot(1L, new BigDecimal("10"));
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionPlan.DeductionEntry(1L, new BigDecimal("3"), new BigDecimal("10"), new BigDecimal("7"))),
                BigDecimal.valueOf(3), BigDecimal.valueOf(10), true);

        stubHappyPath(cashier, branch, product, lot, plan);
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        CreatePosSaleRequest req = new CreatePosSaleRequest(
                List.of(
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1),
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1),
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1)
                ),
                PaymentMethod.CASH, null, null);
        service.createSale(req, cashier);

        // FEFO policy receives the merged quantity (3) and the stock_lot
        // query is invoked exactly once for the merged product.
        verify(fefoPolicy, times(1)).plan(anyList(), eq(BigDecimal.valueOf(3)));
    }

    // ---------------------------------------------------------------------------
    // Order header
    // ---------------------------------------------------------------------------

    @Test
    void createSale_usesPOSTypeAndPAIDStatus() {
        User cashier = cashier();
        stubHappyPath(cashier, branch(BRANCH_ID, true),
                product(PRODUCT_ID, "X", new BigDecimal("100")),
                stockLot(1L, new BigDecimal("5")),
                planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());
        Order saved = orderCaptor.getValue();
        assertThat(saved.getType()).isEqualTo(OrderType.POS);
        assertThat(saved.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(saved.getFulfillmentType()).isEqualTo(FulfillmentType.PICKUP);
        assertThat(saved.getCashSessionId()).isEqualTo(SESSION_ID);
        assertThat(saved.getCreatedByUser()).isSameAs(cashier);
        assertThat(saved.getCustomerUser()).isNull();
        assertThat(saved.getCustomerNameSnapshot()).contains("Venta POS").contains(cashier.getFirstName());
    }

    @Test
    void createSale_usesPaymentProviderManualAndApproved() {
        User cashier = cashier();
        stubHappyPath(cashier, branch(BRANCH_ID, true),
                product(PRODUCT_ID, "X", new BigDecimal("100")),
                stockLot(1L, new BigDecimal("5")),
                planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.QR), cashier);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        List<Payment> payments = captor.getValue().getPayments();
        assertThat(payments).hasSize(1);
        Payment payment = payments.get(0);
        assertThat(payment.getProvider()).isEqualTo(PaymentProvider.MANUAL);
        assertThat(payment.getMethod()).isEqualTo(PaymentMethod.QR);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(payment.getAmount()).isEqualByComparingTo("100.00");
        assertThat(payment.getCurrency()).isEqualTo("ARS");
        assertThat(payment.getCashSessionId()).isEqualTo(SESSION_ID);
    }

    @Test
    void createSale_persistsCashReceivedInPaymentMetadata() {
        User cashier = cashier();
        stubHappyPath(cashier, branch(BRANCH_ID, true),
                product(PRODUCT_ID, "X", new BigDecimal("100")),
                stockLot(1L, new BigDecimal("5")),
                planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequestWithCashReceived(PRODUCT_ID, 1, PaymentMethod.CASH, new BigDecimal("200.00")),
                cashier);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        Payment payment = captor.getValue().getPayments().get(0);
        assertThat(payment.getMetadata()).contains("\"cashReceived\":\"200.00\"");
    }

    @Test
    void createSale_stockMovementQuantityIsNegative() {
        User cashier = cashier();
        stubHappyPath(cashier, branch(BRANCH_ID, true),
                product(PRODUCT_ID, "X", new BigDecimal("100")),
                stockLot(1L, new BigDecimal("5")),
                planOf(new BigDecimal("2"), 1L, new BigDecimal("5"), new BigDecimal("3")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 2, PaymentMethod.CASH), cashier);

        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.POS_SALE);
        assertThat(captor.getValue().getQuantity()).isEqualByComparingTo("-2");
        assertThat(captor.getValue().getReferenceType()).isEqualTo("POS_SALE");
    }

    @Test
    void createSale_createsOneStockMovementPerLotDeducted() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "X", new BigDecimal("100"));
        StockLot lotA = stockLot(1L, new BigDecimal("5"));
        StockLot lotB = stockLot(2L, new BigDecimal("5"));

        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-20260630-000001");
        when(productRepository.findByIdAndActiveTrue(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(PRODUCT_ID, BRANCH_ID))
                .thenReturn(List.of(lotA, lotB));
        DeductionPlan plan = new DeductionPlan(
                List.of(
                        new DeductionPlan.DeductionEntry(1L, new BigDecimal("2"), new BigDecimal("5"), new BigDecimal("3")),
                        new DeductionPlan.DeductionEntry(2L, new BigDecimal("1"), new BigDecimal("5"), new BigDecimal("4"))
                ),
                BigDecimal.valueOf(3), BigDecimal.valueOf(10), true);
        when(fefoPolicy.plan(anyList(), eq(BigDecimal.valueOf(3)))).thenReturn(plan);
        when(stockLotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(lotA));
        when(stockLotRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(lotB));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 3, PaymentMethod.CASH), cashier);

        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
        verify(stockLotRepository).save(lotA);
        verify(stockLotRepository).save(lotB);
    }

    // ---------------------------------------------------------------------------
    // Error paths
    // ---------------------------------------------------------------------------

    @Test
    void createSale_rejectsWhenCashierHasNoBranch() {
        User cashier = new User(null, "admin@x.com", "hash", "A", "B", null, Role.ADMIN);
        assertThatThrownBy(() ->
                service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("CASH_BRANCH_REQUIRED");
    }

    @Test
    void createSale_propagatesCashSessionNotFound() {
        User cashier = cashier();
        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenThrow(new DomainException("CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "No session"));

        assertThatThrownBy(() ->
                service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("CASH_SESSION_NOT_FOUND");
    }

    @Test
    void createSale_rejectsWhenProductInactive() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-1");
        when(productRepository.findByIdAndActiveTrue(PRODUCT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("PRODUCT_NOT_FOUND");
    }

    @Test
    void createSale_rejectsInsufficientStock() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "X", new BigDecimal("100"));
        StockLot lot = stockLot(1L, new BigDecimal("1"));

        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-1");
        when(productRepository.findByIdAndActiveTrue(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(PRODUCT_ID, BRANCH_ID))
                .thenReturn(List.of(lot));
        when(fefoPolicy.plan(anyList(), eq(BigDecimal.valueOf(5))))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Insufficient stock"));

        assertThatThrownBy(() ->
                service.createSale(saleRequest(PRODUCT_ID, 5, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INSUFFICIENT_STOCK");

        verify(stockLotRepository, never()).save(any(StockLot.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void createSale_rejectsWhenBranchInactive() {
        User cashier = cashier();
        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchRepository.findById(BRANCH_ID))
                .thenReturn(Optional.of(branch(BRANCH_ID, false)));

        assertThatThrownBy(() ->
                service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("BRANCH_NOT_FOUND");
    }

    // ---------------------------------------------------------------------------
    // Snapshot behavior
    // ---------------------------------------------------------------------------

    @Test
    void createSale_persistsProductNameAndBarcodeSnapshots() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "Aceite de Oliva", new BigDecimal("100"));
        ReflectionTestUtils.setField(product, "barcode", "7501234567890");
        StockLot lot = stockLot(1L, new BigDecimal("5"));
        DeductionPlan plan = planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4"));

        stubHappyPath(cashier, branch, product, lot, plan);
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        OrderItem item = captor.getValue().getItems().get(0);
        assertThat(item.getProductNameSnapshot()).isEqualTo("Aceite de Oliva");
        assertThat(item.getProductBarcodeSnapshot()).isEqualTo("7501234567890");
        assertThat(item.getUnitPrice()).isEqualByComparingTo("100.00");
    }

    @Test
    void createSale_normalizesBlankNotes() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "X", new BigDecimal("100"));
        StockLot lot = stockLot(1L, new BigDecimal("5"));
        DeductionPlan plan = planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4"));

        stubHappyPath(cashier, branch, product, lot, plan);
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        CreatePosSaleRequest req = new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(PRODUCT_ID, 1)),
                PaymentMethod.CASH, null, "   ");
        service.createSale(req, cashier);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        assertThat(captor.getValue().getNotes()).isNull();
    }

    @Test
    void createSale_trimsAndPersistsNotes() {
        User cashier = cashier();
        Branch branch = branch(BRANCH_ID, true);
        Product product = product(PRODUCT_ID, "X", new BigDecimal("100"));
        StockLot lot = stockLot(1L, new BigDecimal("5"));
        DeductionPlan plan = planOf(new BigDecimal("1"), 1L, new BigDecimal("5"), new BigDecimal("4"));

        stubHappyPath(cashier, branch, product, lot, plan);
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        CreatePosSaleRequest req = new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(PRODUCT_ID, 1)),
                PaymentMethod.CASH, null, "  cliente moroso  ");
        service.createSale(req, cashier);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(captor.capture());
        assertThat(captor.getValue().getNotes()).isEqualTo("cliente moroso");
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private void stubHappyPath(User cashier, Branch branch, Product product, StockLot lot, DeductionPlan plan) {
        when(cashService.getCurrentSession(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-20260630-000001");
        when(productRepository.findByIdAndActiveTrue(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(PRODUCT_ID, BRANCH_ID))
                .thenReturn(List.of(lot));
        when(fefoPolicy.plan(anyList(), any(BigDecimal.class))).thenReturn(plan);
        when(stockLotRepository.findByIdForUpdate(lot.getId())).thenReturn(Optional.of(lot));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private static User cashier() {
        // Constructor: (branchId, email, passwordHash, firstName, lastName, phone, role)
        return new User(BRANCH_ID, "cashier@x.com", "hash", "Carla", "Cajero", null, Role.EMPLOYEE);
    }

    private static Branch branch(Long id, boolean active) {
        // Branch has a protected no-args constructor + Lombok @Getter (no setter),
        // so we instantiate via reflection and set fields explicitly.
        try {
            var ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch b = ctor.newInstance();
            ReflectionTestUtils.setField(b, "id", id);
            ReflectionTestUtils.setField(b, "name", "Branch " + id);
            ReflectionTestUtils.setField(b, "active", active);
            return b;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to build Branch fixture", e);
        }
    }

    private static Product product(Long id, String name, BigDecimal price) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSalePrice(price);
        p.setActive(true);
        return p;
    }

    private static StockLot stockLot(Long id, BigDecimal available) {
        StockLot lot = new StockLot();
        lot.setId(id);
        lot.setQuantityAvailable(available);
        lot.setUnitCost(new BigDecimal("50.00"));
        return lot;
    }

    private static DeductionPlan planOf(BigDecimal toDeduct, Long lotId, BigDecimal before, BigDecimal after) {
        return new DeductionPlan(
                List.of(new DeductionPlan.DeductionEntry(lotId, toDeduct, before, after)),
                toDeduct, before, true);
    }

    private static CashSessionDto cashSessionDto(Long sessionId, Long branchId) {
        return new CashSessionDto(
                sessionId, CashSessionStatus.OPEN, branchId, "Branch " + branchId,
                1L, "Carla", new BigDecimal("100.00"), null, null,
                null, null, null, null, null, null, null, null, null, null,
                null, null
        );
    }

    private static CreatePosSaleRequest saleRequest(Long productId, int qty, PaymentMethod method) {
        return new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(productId, qty)),
                method, null, null);
    }

    private static CreatePosSaleRequest saleRequestWithCashReceived(
            Long productId, int qty, PaymentMethod method, BigDecimal cashReceived) {
        return new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(productId, qty)),
                method, cashReceived, null);
    }

    private static OrderDetailDto orderDetailDto() {
        return new OrderDetailDto(
                1L, "PS-20260630-000001", OrderType.POS, OrderStatus.PAID,
                FulfillmentType.PICKUP, BRANCH_ID, "Branch 1",
                null, "Venta POS - Carla Cajero", null, null,
                1L, "Carla Cajero",
                new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"),
                null, null,
                List.of(), List.of(),
                null, null, null, null, null, null
        );
    }

    @SuppressWarnings("unused")
    private static int unusedAnyInt() { return anyInt(); }
}
