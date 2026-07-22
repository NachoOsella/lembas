package com.dietetica.lembas.pos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PosStockCommand;
import com.dietetica.lembas.orders.api.OrderCommand;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.service.OrderMapper;
import com.dietetica.lembas.orders.service.OrderNumberGenerator;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** Unit tests for the POS sale orchestration and its inventory boundary. */
@ExtendWith(MockitoExtension.class)
class PosSaleServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long SESSION_ID = 10L;
    private static final Long PRODUCT_ID = 100L;
    private static final Long ORDER_ID = 200L;

    @Mock
    private CashService cashService;

    @Mock
    private ProductLookup productLookup;

    @Mock
    private PosStockCommand posStockCommand;

    @Mock
    private OrderCommand orderCommand;

    @Mock
    private OrderNumberGenerator orderNumberGenerator;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private BranchQuery branchQuery;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private PosSaleService service;

    @BeforeEach
    void setUp() {
        service = new PosSaleService(
                cashService,
                productLookup,
                posStockCommand,
                orderCommand,
                orderNumberGenerator,
                orderMapper,
                branchQuery,
                objectMapper);
    }

    @Test
    void createSale_persistsUnifiedOrderAndDelegatesDeductionToPosContract() {
        User cashier = cashier();
        Product product = product(PRODUCT_ID, "Aceite", new BigDecimal("2500.00"));
        stubSale(cashier, branch(BRANCH_ID, true), product);
        OrderDetailDto expected = orderDetailDto();
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(expected);

        OrderDetailDto result = service.createSale(saleRequest(PRODUCT_ID, 3, PaymentMethod.CASH), cashier);

        assertThat(result).isSameAs(expected);
        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderCommand).save(orderCaptor.capture());
        Order savedOrder = orderCaptor.getValue();
        assertThat(savedOrder.getType()).isEqualTo(OrderType.POS);
        assertThat(savedOrder.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(savedOrder.getFulfillmentType()).isEqualTo(FulfillmentType.PICKUP);
        assertThat(savedOrder.getCashSessionId()).isEqualTo(SESSION_ID);
        assertThat(savedOrder.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getQuantity()).isEqualByComparingTo("3");
            assertThat(item.getUnitPrice()).isEqualByComparingTo("2500.00");
            assertThat(item.getSubtotalAmount()).isEqualByComparingTo("7500.00");
            assertThat(item.getProductNameSnapshot()).isEqualTo("Aceite");
        });
        verify(posStockCommand).deductForPosOrder(ORDER_ID);
    }

    @Test
    void createSale_mergesDuplicateItemsBeforeDelegatingToInventory() {
        User cashier = cashier();
        Product product = product(PRODUCT_ID, "Aceite", new BigDecimal("100.00"));
        stubSale(cashier, branch(BRANCH_ID, true), product);
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        CreatePosSaleRequest request = new CreatePosSaleRequest(
                List.of(
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1),
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1),
                        new CreatePosSaleItemRequest(PRODUCT_ID, 1)),
                PaymentMethod.CASH,
                null,
                null);

        service.createSale(request, cashier);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderCommand).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getItems()).singleElement().satisfies(item -> assertThat(item.getQuantity())
                .isEqualByComparingTo("3"));
        verify(posStockCommand).deductForPosOrder(ORDER_ID);
    }

    @Test
    void createSale_usesApprovedManualPaymentWithCashSession() {
        User cashier = cashier();
        stubSale(cashier, branch(BRANCH_ID, true), product(PRODUCT_ID, "X", new BigDecimal("100")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.QR), cashier);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderCommand).save(orderCaptor.capture());
        Payment payment = orderCaptor.getValue().getPayments().getFirst();
        assertThat(payment.getProvider()).isEqualTo(PaymentProvider.MANUAL);
        assertThat(payment.getMethod()).isEqualTo(PaymentMethod.QR);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(payment.getAmount()).isEqualByComparingTo("100.00");
        assertThat(payment.getCashSessionId()).isEqualTo(SESSION_ID);
    }

    @Test
    void createSale_preservesCashReceivedAndNormalizedNotes() {
        User cashier = cashier();
        stubSale(cashier, branch(BRANCH_ID, true), product(PRODUCT_ID, "X", new BigDecimal("100")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        CreatePosSaleRequest request = new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(PRODUCT_ID, 1)),
                PaymentMethod.CASH,
                new BigDecimal("200.00"),
                "  cliente habitual  ");
        service.createSale(request, cashier);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderCommand).save(orderCaptor.capture());
        Order order = orderCaptor.getValue();
        assertThat(order.getNotes()).isEqualTo("cliente habitual");
        assertThat(order.getPayments().getFirst().getMetadata()).contains("\"cashReceived\":\"200.00\"");
    }

    @Test
    void createSale_propagatesInsufficientStockFromPosContract() {
        User cashier = cashier();
        stubSale(cashier, branch(BRANCH_ID, true), product(PRODUCT_ID, "X", new BigDecimal("100")));
        doThrow(new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Insufficient stock"))
                .when(posStockCommand)
                .deductForPosOrder(ORDER_ID);

        assertThatThrownBy(() -> service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_STOCK");

        verify(posStockCommand).deductForPosOrder(ORDER_ID);
    }

    @Test
    void createSale_allowsAdminToSellAgainstSelectedBranch() {
        User admin = new User(null, "admin@x.com", "hash", "A", "B", null, Role.ADMIN);
        stubSale(admin, branch(BRANCH_ID, true), product(PRODUCT_ID, "X", new BigDecimal("100")));
        when(orderMapper.toDetailDto(any(Order.class))).thenReturn(orderDetailDto());

        service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), admin, BRANCH_ID);

        verify(cashService).getCurrentSessionForUpdate(BRANCH_ID, admin);
    }

    @Test
    void createSale_rejectsAdminWithoutSelectedBranch() {
        User admin = new User(null, "admin@x.com", "hash", "A", "B", null, Role.ADMIN);

        assertThatThrownBy(() -> service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), admin))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CASH_BRANCH_REQUIRED");
    }

    @Test
    void createSale_rejectsInactiveProductBeforeInventoryDeduction() {
        User cashier = cashier();
        when(cashService.getCurrentSessionForUpdate(any(), eq(cashier)))
                .thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchQuery.findActiveById(BRANCH_ID)).thenReturn(Optional.of(branch(BRANCH_ID, true)));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-1");
        when(productLookup.findActiveById(PRODUCT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createSale(saleRequest(PRODUCT_ID, 1, PaymentMethod.CASH), cashier))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRODUCT_NOT_FOUND");

        verify(posStockCommand, never()).deductForPosOrder(any());
    }

    private void stubSale(User user, Branch branch, Product product) {
        when(cashService.getCurrentSessionForUpdate(any(), eq(user))).thenReturn(cashSessionDto(SESSION_ID, BRANCH_ID));
        when(branchQuery.findActiveById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(orderNumberGenerator.next(OrderType.POS)).thenReturn("PS-20260630-000001");
        when(productLookup.findActiveById(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(orderCommand.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(ORDER_ID);
            return order;
        });
    }

    private static User cashier() {
        return new User(BRANCH_ID, "cashier@x.com", "hash", "Carla", "Cajero", null, Role.EMPLOYEE);
    }

    private static Branch branch(Long id, boolean active) {
        try {
            var constructor = Branch.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Branch branch = constructor.newInstance();
            ReflectionTestUtils.setField(branch, "id", id);
            ReflectionTestUtils.setField(branch, "name", "Branch " + id);
            ReflectionTestUtils.setField(branch, "active", active);
            return branch;
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Failed to build branch fixture", exception);
        }
    }

    private static Product product(Long id, String name, BigDecimal price) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setSalePrice(price);
        product.setActive(true);
        return product;
    }

    private static CashSessionDto cashSessionDto(Long sessionId, Long branchId) {
        return new CashSessionDto(
                sessionId,
                CashSessionStatus.OPEN,
                branchId,
                "Branch " + branchId,
                1L,
                "Carla",
                new BigDecimal("100.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    private static CreatePosSaleRequest saleRequest(Long productId, int quantity, PaymentMethod method) {
        return new CreatePosSaleRequest(List.of(new CreatePosSaleItemRequest(productId, quantity)), method, null, null);
    }

    private static OrderDetailDto orderDetailDto() {
        return new OrderDetailDto(
                ORDER_ID,
                "PS-20260630-000001",
                OrderType.POS,
                OrderStatus.PAID,
                FulfillmentType.PICKUP,
                BRANCH_ID,
                "Branch 1",
                null,
                "Venta POS - Carla Cajero",
                null,
                null,
                1L,
                "Carla Cajero",
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                null,
                null,
                List.of(),
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }
}
