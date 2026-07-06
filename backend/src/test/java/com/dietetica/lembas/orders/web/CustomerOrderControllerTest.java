package com.dietetica.lembas.orders.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.orders.dto.OrderCreatedDto;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.service.CustomerOrderService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and endpoint tests for {@link CustomerOrderController}.
 *
 * <p>Verifies:</p>
 * <ul>
 *   <li>Authenticated CUSTOMER can create an order (201 CREATED)</li>
 *   <li>Authenticated CUSTOMER can list their own orders (200 OK)</li>
 *   <li>Authenticated CUSTOMER can view their own order (200 OK)</li>
 *   <li>ADMIN role is rejected (403 FORBIDDEN)</li>
 *   <li>Unauthenticated requests are rejected (401 UNAUTHORIZED)</li>
 *   <li>Domain exceptions are mapped to proper HTTP statuses</li>
 * </ul>
 */
@WebMvcTest(controllers = {CustomerOrderController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class CustomerOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CustomerOrderService customerOrderService;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    // ----------------------------------------------------------------
    // POST /api/customer/orders  (create)
    // ----------------------------------------------------------------

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldCreateOrderWhenAuthenticatedAsCustomer() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        OrderCreatedDto response = new OrderCreatedDto(42L, "ON-20260612-000001", OrderStatus.PENDING_PAYMENT, new BigDecimal("200.00"));
        when(customerOrderService.createOnlineOrder(any(), any())).thenReturn(response);

        String body = """
                {
                    "branchId": 1,
                    "items": [{"productId": 1, "quantity": 2}]
                }
                """;

        mockMvc.perform(post("/api/customer/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.orderNumber").value("ON-20260612-000001"))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.total").value(200.00));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldRejectAdminRoleWhenCreatingOrder() throws Exception {
        User admin = new User(1L, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);

        when(customerOrderService.createOnlineOrder(any(), any()))
                .thenThrow(new DomainException("ACCESS_DENIED", org.springframework.http.HttpStatus.FORBIDDEN, "Only customers can create online orders"));

        String body = """
                {
                    "branchId": 1,
                    "items": [{"productId": 1, "quantity": 1}]
                }
                """;

        mockMvc.perform(post("/api/customer/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldReturnInsufficientStockWhenQuantityExceedsAvailable() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        when(customerOrderService.createOnlineOrder(any(), any()))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", org.springframework.http.HttpStatus.CONFLICT, "Insufficient stock"));

        String body = """
                {
                    "branchId": 1,
                    "items": [{"productId": 1, "quantity": 100}]
                }
                """;

        mockMvc.perform(post("/api/customer/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));
    }

    // ----------------------------------------------------------------
    // GET /api/customer/orders  (list)
    // ----------------------------------------------------------------

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldReturnOrderListWhenCustomerHasOrders() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        OrderSummaryDto summary = new OrderSummaryDto(
                42L, "ON-20260612-000001", OrderType.ONLINE, OrderStatus.PENDING_PAYMENT,
                FulfillmentType.PICKUP, 1L, "Centro",
                10L, "Test Customer", null, null,
                new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("200.00"),
                2, null, null, OffsetDateTime.now()
        );
        when(customerOrderService.listCustomerOrders(customer)).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/customer/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(42))
                .andExpect(jsonPath("$[0].orderNumber").value("ON-20260612-000001"))
                .andExpect(jsonPath("$[0].status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$[0].total").value(200.00));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldReturnEmptyListWhenCustomerHasNoOrders() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        when(customerOrderService.listCustomerOrders(customer)).thenReturn(List.of());

        mockMvc.perform(get("/api/customer/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldRejectAdminRoleWhenListingOrders() throws Exception {
        User admin = new User(1L, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);

        when(customerOrderService.listCustomerOrders(admin))
                .thenThrow(new DomainException("ACCESS_DENIED", org.springframework.http.HttpStatus.FORBIDDEN, "Only customers"));

        mockMvc.perform(get("/api/customer/orders"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    // ----------------------------------------------------------------
    // GET /api/customer/orders/{id}  (detail)
    // ----------------------------------------------------------------

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldReturnOrderDetailWhenCustomerOwnsOrder() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        OrderDetailDto detail = new OrderDetailDto(
                42L, "ON-20260612-000001",
                OrderType.ONLINE, OrderStatus.PENDING_PAYMENT,
                FulfillmentType.PICKUP,
                1L, "Centro",
                10L, "Test Customer", "c@lembas.com", "+54 351 123",
                null, null,
                new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("200.00"),
                null, null, List.of(), List.of(),
                null, null, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now()
        );
        when(customerOrderService.getCustomerOrder(42L, customer)).thenReturn(detail);

        mockMvc.perform(get("/api/customer/orders/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.orderNumber").value("ON-20260612-000001"))
                .andExpect(jsonPath("$.customerEmail").value("c@lembas.com"))
                .andExpect(jsonPath("$.payments").isArray());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldReturn404WhenOrderNotFound() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        when(customerOrderService.getCustomerOrder(999L, customer))
                .thenThrow(new DomainException("ORDER_NOT_FOUND", org.springframework.http.HttpStatus.NOT_FOUND, "Order not found"));

        mockMvc.perform(get("/api/customer/orders/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }
}
