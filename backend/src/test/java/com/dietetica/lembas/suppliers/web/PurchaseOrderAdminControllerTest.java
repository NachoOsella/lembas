package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderDetailDto;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderItemDto;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderSummaryDto;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.service.PurchaseOrderPdfService;
import com.dietetica.lembas.suppliers.service.PurchaseOrderService;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for purchase order admin endpoints. */
@WebMvcTest(controllers = {PurchaseOrderAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class PurchaseOrderAdminControllerTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PurchaseOrderService purchaseOrderService;
    @MockitoBean
    private PurchaseOrderPdfService purchaseOrderPdfService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService userDetailsService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsPurchaseOrders() throws Exception {
        when(purchaseOrderService.list(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(summary()), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/purchase-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].supplierName").value("Distribuidora"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return201_when_managerCreatesPurchaseOrder() throws Exception {
        when(purchaseOrderService.create(any())).thenReturn(detail("DRAFT"));
        String json = """
                {
                  "supplierId": 10,
                  "branchId": 20,
                  "expectedDeliveryDate": "2026-07-01",
                  "items": [{"supplierProductId": 30, "quantityOrdered": 2}]
                }
                """;

        mockMvc.perform(post("/api/admin/purchase-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.items[0].subtotal").value(4400));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminConfirmsPurchaseOrder() throws Exception {
        when(purchaseOrderService.confirm(1L)).thenReturn(detail("CONFIRMED"));

        mockMvc.perform(patch("/api/admin/purchase-orders/1/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_returnPdf_when_adminDownloadsPurchaseOrderPdf() throws Exception {
        when(purchaseOrderService.getForPdf(1L)).thenReturn(new PurchaseOrder());
        when(purchaseOrderPdfService.generate(any(PurchaseOrder.class))).thenReturn("%PDF-test".getBytes());

        mockMvc.perform(get("/api/admin/purchase-orders/1/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"purchase-order-1.pdf\""));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_createPurchaseOrderHasNoItems() throws Exception {
        String invalidJson = """
                {"supplierId": 10, "branchId": 20, "items": []}
                """;

        mockMvc.perform(post("/api/admin/purchase-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(objectMapper.readTree(invalidJson))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    /** Creates a list row response. */
    private PurchaseOrderSummaryDto summary() {
        return new PurchaseOrderSummaryDto(1L, 10L, "Distribuidora", 20L, "Centro", "DRAFT", OffsetDateTime.now(), LocalDate.of(2026, 7, 1), BigDecimal.valueOf(4400), 1, OffsetDateTime.now());
    }

    /** Creates a detail response. */
    private PurchaseOrderDetailDto detail(String status) {
        return new PurchaseOrderDetailDto(
                1L,
                10L,
                "Distribuidora",
                null,
                null,
                null,
                20L,
                "Centro",
                status,
                OffsetDateTime.now(),
                LocalDate.of(2026, 7, 1),
                null,
                BigDecimal.valueOf(4400),
                List.of(new PurchaseOrderItemDto(2L, 30L, "Yerba", "779", 40L, "SKU", BigDecimal.valueOf(2), BigDecimal.valueOf(2200), BigDecimal.valueOf(4400))),
                OffsetDateTime.now(),
                null,
                null,
                null,
                null
        );
    }
}
