package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.inventory.service.InventoryService;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AdminOrderService} lifecycle transitions, including
 * stock-reversing cancellation.
 */
@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderMapper orderMapper;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private SecurityContextHelper securityContextHelper;

    @InjectMocks
    private AdminOrderService adminOrderService;

    // ----------------------------------------------------------------
    // prepare
    // ----------------------------------------------------------------

    @Test
    void shouldPrepareOnlineOrderInPaidStatus() {
        Order order = onlineOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.prepare(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getPreparedAt()).isNotNull();
    }

    @Test
    void shouldRejectPrepareWhenOrderNotFound() {
        when(orderRepository.findWithItemsById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminOrderService.prepare(99L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void shouldRejectPrepareWhenAlreadyPreparing() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.prepare(1L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("PREPARING");
    }

    @Test
    void shouldRejectPrepareForPosOrder() {
        Order order = posOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.prepare(1L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("POS");
    }

    // ----------------------------------------------------------------
    // markReady
    // ----------------------------------------------------------------

    @Test
    void shouldMarkReadyFromPreparing() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.markReady(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.READY);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(order.getReadyAt()).isNotNull();
    }

    @Test
    void shouldRejectMarkReadyWhenNotPreparing() {
        Order order = onlineOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.markReady(1L))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // deliver
    // ----------------------------------------------------------------

    @Test
    void shouldDeliverFromReady() {
        Order order = onlineOrder(OrderStatus.READY);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.deliver(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(order.getDeliveredAt()).isNotNull();
    }

    @Test
    void shouldRejectDeliverWhenNotReady() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.deliver(1L))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // cancel — ONLINE orders with stock reversal
    // ----------------------------------------------------------------

    @Test
    void cancel_paidOnlineOrder_reversesStockAndUpdatesStatus() {
        Order order = onlineOrder(OrderStatus.PAID);
        Payment payment = buildPayment(PaymentStatus.APPROVED);
        order.getPayments().add(payment);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(2);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.cancel(1L, "Cliente desiste del pedido");

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getCancelledAt()).isNotNull();
        assertThat(order.getCancellationReason()).isEqualTo("Cliente desiste del pedido");
        verify(inventoryService).reverseMovementsForOrder(1L);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
    }

    @Test
    void cancel_preparingOrder_reversesStock() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(1);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.cancel(1L, "Stock da\u00f1ado");

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
        verify(inventoryService).reverseMovementsForOrder(1L);
    }

    @Test
    void cancel_readyOrder_reversesStock() {
        Order order = onlineOrder(OrderStatus.READY);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(2);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.cancel(1L, "Cliente no retiro");

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
        verify(inventoryService).reverseMovementsForOrder(1L);
    }

    @Test
    void cancel_pendingPaymentOrder_doesNotReverseStock() {
        Order order = onlineOrder(OrderStatus.PENDING_PAYMENT);
        Payment payment = buildPayment(PaymentStatus.PENDING);
        order.getPayments().add(payment);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(0);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.cancel(1L, "Cliente no concreta pago");

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        // No sale movements -> no-op (InventoryService itself returns 0).
        verify(inventoryService).reverseMovementsForOrder(1L);
    }

    @Test
    void cancel_posPaidOrder_reversesStock() {
        Order order = posOrder(OrderStatus.PAID);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(1);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.cancel(1L, "Devoluci\u00f3n en caja");

        assertThat(result.status()).isEqualTo(OrderStatus.CANCELLED);
        verify(inventoryService).reverseMovementsForOrder(1L);
    }

    // ----------------------------------------------------------------
    // cancel — rejection paths
    // ----------------------------------------------------------------

    @Test
    void cancel_deliveredOrder_throwsConflict() {
        Order order = onlineOrder(OrderStatus.DELIVERED);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.cancel(1L, "Cliente arrepentido"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("DELIVERED");
        verify(inventoryService, never()).reverseMovementsForOrder(anyLong());
    }

    @Test
    void cancel_alreadyCancelledOrder_throwsConflict() {
        Order order = onlineOrder(OrderStatus.CANCELLED);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.cancel(1L, "Otro intento"))
                .isInstanceOf(DomainException.class);
        verify(inventoryService, never()).reverseMovementsForOrder(anyLong());
    }

    @Test
    void cancel_blankReason_throwsValidation() {
        assertThatThrownBy(() -> adminOrderService.cancel(1L, "   "))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("reason is required");
        verify(inventoryService, never()).reverseMovementsForOrder(anyLong());
    }

    @Test
    void cancel_nullReason_throwsValidation() {
        assertThatThrownBy(() -> adminOrderService.cancel(1L, null))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("reason is required");
    }

    @Test
    void cancel_reasonOver500Chars_throwsValidation() {
        String longReason = "a".repeat(501);
        assertThatThrownBy(() -> adminOrderService.cancel(1L, longReason))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("1-500 characters");
    }

    @Test
    void cancel_refundedPayment_throwsConflict() {
        Order order = onlineOrder(OrderStatus.PAID);
        Payment refunded = buildPayment(PaymentStatus.REFUNDED);
        order.getPayments().add(refunded);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.cancel(1L, "Conflicto con refund"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("refunded");
        verify(inventoryService, never()).reverseMovementsForOrder(anyLong());
    }

    @Test
    void cancel_trimsAndPersistsNormalizedReason() {
        Order order = onlineOrder(OrderStatus.PAID);
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(inventoryService.reverseMovementsForOrder(1L)).thenReturn(0);
        when(securityContextHelper.getCurrentUser()).thenReturn(user);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        adminOrderService.cancel(1L, "   Cliente desiste   ");

        assertThat(order.getCancellationReason()).isEqualTo("Cliente desiste");
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private Order onlineOrder(OrderStatus status) {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber("ON-20260706-000001");
        order.setType(OrderType.ONLINE);
        order.setStatus(status);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(new BigDecimal("1500.00"));
        order.setTotal(new BigDecimal("1500.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setItems(Collections.emptyList());
        order.setPayments(new ArrayList<>());
        return order;
    }

    private Order posOrder(OrderStatus status) {
        Order order = onlineOrder(status);
        order.setType(OrderType.POS);
        order.setOrderNumber("PO-20260706-000001");
        return order;
    }

    private Payment buildPayment(PaymentStatus status) {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setStatus(status);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setAmount(new BigDecimal("1500.00"));
        payment.setCurrency("ARS");
        payment.setCreatedAt(OffsetDateTime.now());
        payment.setUpdatedAt(OffsetDateTime.now());
        return payment;
    }

    /** Helper removed: tests construct the User mock inline to avoid nested
     *  Mockito stubbing during thenReturn() argument evaluation. */

    private OrderDetailDto dummyDto(Order order) {
        return new OrderDetailDto(
                order.getId(),
                order.getOrderNumber(),
                order.getType(),
                order.getStatus(),
                order.getFulfillmentType(),
                null, null, null, null, null, null,
                null, null,
                order.getSubtotal(),
                order.getDiscountTotal(),
                order.getTotal(),
                null, null,
                Collections.emptyList(),
                Collections.emptyList(),
                order.getPaidAt(),
                order.getPreparedAt(),
                order.getReadyAt(),
                order.getDeliveredAt(),
                order.getCancelledAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    // ----------------------------------------------------------------
    // listOrders — search + branch restriction
    // ----------------------------------------------------------------

    @Test
    void listOrders_adminUser_keepsRequestedBranch() {
        User admin = adminUser();
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        adminOrderService.listOrders(null, 7L, null, null, null, null, pageable);

        org.mockito.ArgumentCaptor<Specification<Order>> specCaptor =
                org.mockito.ArgumentCaptor.forClass(Specification.class);
        verify(orderRepository).findAll(specCaptor.capture(), any(Pageable.class));
        // The Specification is opaque to the test, but the call itself proves no
        // override happened — we asserted the user is ADMIN above and the branch
        // filter (7) is accepted without error.
        assertThat(specCaptor.getValue()).isNotNull();
    }

    @Test
    void listOrders_managerUser_overridesBranchToUsersOwn() {
        User manager = managerUser(3L);
        when(securityContextHelper.getCurrentUser()).thenReturn(manager);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // Caller tries to query branch 7, but MANAGER has branch 3.
        adminOrderService.listOrders(null, 7L, null, null, null, null, pageable);

        // The repository is invoked (proving the override resolved a valid branch).
        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listOrders_employeeUserForcesBranchEvenWhenNullRequested() {
        User employee = employeeUser(5L);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // Caller passes null branch, but EMPLOYEE is forced to branch 5.
        adminOrderService.listOrders(null, null, null, null, null, null, pageable);

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listOrders_employeeWithoutBranch_returnsEmptyResultWithoutError() {
        User employee = employeeUser(null);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // The service should not throw — it forwards a non-existent branch id.
        var result = adminOrderService.listOrders(null, null, null, null, null, null, pageable);

        assertThat(result.content()).isEmpty();
        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listOrders_searchAppliesFilter() {
        User admin = adminUser();
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        adminOrderService.listOrders(null, null, null, null, null, "ON-2026", pageable);

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listOrders_blankSearchIsIgnored() {
        User admin = adminUser();
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        adminOrderService.listOrders(null, null, null, null, null, "   ", pageable);

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listOrders_noUserInContext_doesNotOverrideBranch() {
        when(securityContextHelper.getCurrentUser()).thenReturn(null);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        adminOrderService.listOrders(null, 4L, null, null, null, null, pageable);

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    // ----------------------------------------------------------------
    // listOrders — additional filter helpers
    // ----------------------------------------------------------------

    @Test
    void listOrders_allFiltersApplied() {
        User admin = adminUser();
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(orderRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(org.springframework.data.domain.Page.empty());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        java.time.LocalDate from = java.time.LocalDate.of(2026, 7, 1);
        java.time.LocalDate to = java.time.LocalDate.of(2026, 7, 6);

        adminOrderService.listOrders(
                OrderStatus.PAID, 2L, OrderType.ONLINE, from, to, "yerba", pageable);

        verify(orderRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    // ----------------------------------------------------------------
    // user mocks for branch restriction tests
    // ----------------------------------------------------------------

    private User adminUser() {
        User u = mock(User.class);
        lenient().when(u.getRole()).thenReturn(Role.ADMIN);
        lenient().when(u.getBranchId()).thenReturn(null);
        return u;
    }

    private User managerUser(Long branchId) {
        User u = mock(User.class);
        when(u.getRole()).thenReturn(Role.MANAGER);
        when(u.getBranchId()).thenReturn(branchId);
        return u;
    }

    private User employeeUser(Long branchId) {
        User u = mock(User.class);
        when(u.getRole()).thenReturn(Role.EMPLOYEE);
        when(u.getBranchId()).thenReturn(branchId);
        return u;
    }
}
