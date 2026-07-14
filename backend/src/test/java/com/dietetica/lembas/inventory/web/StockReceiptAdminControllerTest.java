package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.service.PurchaseReceiptService;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for {@link StockReceiptAdminController}. */
@WebMvcTest(controllers = {StockReceiptAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class StockReceiptAdminControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PurchaseReceiptService purchaseReceiptService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminConfirmsPurchaseReceipt() throws Exception {
        PurchaseReceiptRequest request = new PurchaseReceiptRequest(
                1L,
                "FAC-1",
                null,
                List.of(new PurchaseReceiptItemRequest(100L, BigDecimal.valueOf(2), BigDecimal.valueOf(500), "L-1", LocalDate.now().plusDays(30)))
        );
        when(purchaseReceiptService.confirm(any(PurchaseReceiptRequest.class))).thenReturn(aReceipt());

        mockMvc.perform(post("/api/admin/stock/receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(50L))
                .andExpect(jsonPath("$.purchaseOrderId").value(1L))
                .andExpect(jsonPath("$.purchaseOrderStatus").value("RECEIVED"))
                .andExpect(jsonPath("$.items[0].createdStockLotId").value(70L));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return201_when_employeeConfirmsPurchaseReceipt() throws Exception {
        PurchaseReceiptRequest request = new PurchaseReceiptRequest(
                1L,
                "FAC-EMP-1",
                null,
                List.of(new PurchaseReceiptItemRequest(100L, BigDecimal.ONE, BigDecimal.valueOf(500), "L-EMP", LocalDate.now().plusDays(30)))
        );
        when(purchaseReceiptService.confirm(any(PurchaseReceiptRequest.class))).thenReturn(aReceipt());

        mockMvc.perform(post("/api/admin/stock/receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_receiptHasInvalidQuantity() throws Exception {
        String invalidJson = """
                {
                  "purchaseOrderId": 1,
                  "items": [
                    { "purchaseOrderItemId": 100, "quantityReceived": 0, "unitCost": 500 }
                  ]
                }
                """;

        mockMvc.perform(post("/api/admin/stock/receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    /** Creates a confirmed receipt response used by controller tests. */
    private PurchaseReceiptDto aReceipt() {
        return new PurchaseReceiptDto(
                50L,
                1L,
                30L,
                "Proveedor",
                20L,
                "Centro",
                "CONFIRMED",
                "FAC-1",
                OffsetDateTime.now(),
                OffsetDateTime.now(),
                "RECEIVED",
                BigDecimal.valueOf(2),
                List.of(new PurchaseReceiptItemDto(60L, 100L, 10L, "Granola", BigDecimal.valueOf(2), BigDecimal.valueOf(500), "L-1", null, 70L))
        );
    }
}
