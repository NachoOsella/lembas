package com.dietetica.lembas.pos.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.pos.service.PosSaleService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-MVC slice tests for {@link PosSaleController}.
 *
 * <p>Verifies request shape, validation, and error code mapping for the
 * POST /api/pos/sales endpoint.</p>
 */
@WebMvcTest(controllers = {PosSaleController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class PosSaleControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private org.springframework.http.converter.json.MappingJackson2HttpMessageConverter jacksonConverter;

    @MockitoBean private PosSaleService posSaleService;
    @MockitoBean private com.dietetica.lembas.auth.service.SecurityContextHelper securityContextHelper;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private LembasUserDetailsService lembasUserDetailsService;

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createReturns201WithOrderDetail() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "Carla", "Cajero", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);
        OrderDetailDto dto = orderDetailDto();
        when(posSaleService.createSale(any(), eq(cashier), eq(null))).thenReturn(dto);

        String body = """
                {
                  "items": [ { "productId": 100, "quantity": 2 } ],
                  "paymentMethod": "CASH",
                  "notes": "venta mostrador"
                }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("POS"))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.total").value(2500.00));

        verify(posSaleService).createSale(any(), eq(cashier), eq(null));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createPassesSelectedBranchForAdmin() throws Exception {
        User admin = new User(null, "admin@x.com", "h", "Admin", "User", null, Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(posSaleService.createSale(any(), eq(admin), eq(5L))).thenReturn(orderDetailDto());

        String body = """
                { "items": [ { "productId": 100, "quantity": 1 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales?branchId=5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        verify(posSaleService).createSale(any(), eq(admin), eq(5L));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsEmptyItemsTo400() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);

        String body = """
                { "items": [], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsInvalidQuantityTo400() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);

        String body = """
                { "items": [ { "productId": 100, "quantity": 0 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsNullPaymentMethodTo400() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);

        String body = """
                { "items": [ { "productId": 100, "quantity": 1 } ] }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsInsufficientStockTo409() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);
        when(posSaleService.createSale(any(), eq(cashier), eq(null)))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Insufficient stock"));

        String body = """
                { "items": [ { "productId": 100, "quantity": 50 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsNoCashSessionTo404() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);
        when(posSaleService.createSale(any(), eq(cashier), eq(null)))
                .thenThrow(new DomainException("CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "No open session"));

        String body = """
                { "items": [ { "productId": 100, "quantity": 1 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CASH_SESSION_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createMapsProductNotFoundTo404() throws Exception {
        User cashier = new User(1L, "e@x.com", "h", "C", "C", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(cashier);
        when(posSaleService.createSale(any(), eq(cashier), eq(null)))
                .thenThrow(new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));

        String body = """
                { "items": [ { "productId": 99999, "quantity": 1 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    private static OrderDetailDto orderDetailDto() {
        return new OrderDetailDto(
                1L, "PS-1", OrderType.POS, OrderStatus.PAID,
                FulfillmentType.PICKUP, 1L, "Branch",
                null, "Venta POS - Carla", null, null,
                1L, "Carla",
                new BigDecimal("2500.00"), BigDecimal.ZERO, new BigDecimal("2500.00"),
                null, null,
                List.of(), List.of(),
                null, null, null, null, null, null, null
        );
    }
}
