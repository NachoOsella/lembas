package com.dietetica.lembas.orders.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.service.AdminOrderService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpoint-level tests for {@link AdminOrderController}.
 *
 * <p>Verifies routing, serialization, and error mapping. Auth filters are
 * disabled; role checks are covered by the integration-level security tests
 * and the shared {@code SecurityConfig}.</p>
 */
@WebMvcTest(controllers = {AdminOrderController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class AdminOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AdminOrderService adminOrderService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    // ----------------------------------------------------------------
    // GET /api/admin/orders/{id}
    // ----------------------------------------------------------------

    @Test
    void shouldReturnOrderDetail() throws Exception {
        when(adminOrderService.getOrder(1L)).thenReturn(dummyDetail(1L, OrderStatus.PAID));

        mockMvc.perform(get("/api/admin/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.orderNumber").value("ON-20260706-000001"));
    }

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        when(adminOrderService.getOrder(99L))
                .thenThrow(new DomainException("ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Order not found"));

        mockMvc.perform(get("/api/admin/orders/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    // ----------------------------------------------------------------
    // PATCH /api/admin/orders/{id}/prepare
    // ----------------------------------------------------------------

    @Test
    void shouldPrepareOrder() throws Exception {
        when(adminOrderService.prepare(1L))
                .thenReturn(dummyDetail(1L, OrderStatus.PREPARING));

        mockMvc.perform(patch("/api/admin/orders/1/prepare")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARING"))
                .andExpect(jsonPath("$.preparedAt").isNotEmpty());
    }

    @Test
    void shouldReturn409WhenPrepareFailsStateValidation() throws Exception {
        when(adminOrderService.prepare(1L))
                .thenThrow(new DomainException("ORDER_INVALID_STATE", HttpStatus.CONFLICT,
                        "Cannot transition order ON-20260706-000001 from PREPARING to PREPARING"));

        mockMvc.perform(patch("/api/admin/orders/1/prepare")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_INVALID_STATE"));
    }

    // ----------------------------------------------------------------
    // PATCH /api/admin/orders/{id}/ready
    // ----------------------------------------------------------------

    @Test
    void shouldMarkReady() throws Exception {
        when(adminOrderService.markReady(1L))
                .thenReturn(dummyDetail(1L, OrderStatus.READY));

        mockMvc.perform(patch("/api/admin/orders/1/ready")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY"))
                .andExpect(jsonPath("$.readyAt").isNotEmpty());
    }

    // ----------------------------------------------------------------
    // PATCH /api/admin/orders/{id}/delivered
    // ----------------------------------------------------------------

    @Test
    void shouldDeliverOrder() throws Exception {
        when(adminOrderService.deliver(1L))
                .thenReturn(dummyDetail(1L, OrderStatus.DELIVERED));

        mockMvc.perform(patch("/api/admin/orders/1/delivered")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.deliveredAt").isNotEmpty());
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private OrderDetailDto dummyDetail(Long id, OrderStatus status) {
        OffsetDateTime now = OffsetDateTime.now();
        return new OrderDetailDto(
                id,
                "ON-20260706-000001",
                OrderType.ONLINE,
                status,
                FulfillmentType.PICKUP,
                1L, "Sucursal Centro",
                10L, "Ignacio Osella", "ignacio@example.com", null,
                null, null,
                new BigDecimal("1500.00"),
                new BigDecimal("0.00"),
                new BigDecimal("1500.00"),
                null, null,
                Collections.emptyList(),
                Collections.emptyList(),
                status == OrderStatus.PAID ? null : now,
                status == OrderStatus.PREPARING ? now : null,
                status == OrderStatus.READY ? now : null,
                status == OrderStatus.DELIVERED ? now : null,
                null,
                now.minusHours(2),
                now
        );
    }
}
