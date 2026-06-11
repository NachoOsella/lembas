package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDefaultsRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDetailDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemUpdateRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchSummaryDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateManualBatchRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateManualItemRequest;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchType;
import com.dietetica.lembas.suppliers.service.PriceUpdateBatchService;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for price update batch admin endpoints. */
@WebMvcTest(controllers = {PriceUpdateBatchAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class PriceUpdateBatchAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PriceUpdateBatchService service;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService userDetailsService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private final OffsetDateTime now = OffsetDateTime.now();

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldListBatches() throws Exception {
        when(service.list(eq(null), eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(summaryDto(1L, "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/price-update-batches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].supplierName").value("Distribuidora"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldListBatchesWithFilters() throws Exception {
        when(service.list(eq(10L), eq(PriceUpdateBatchStatus.DRAFT), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(summaryDto(1L, "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/price-update-batches?supplierId=10&status=DRAFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldReturnBatchDetail() throws Exception {
        when(service.get(1L)).thenReturn(detailDto(1L));

        mockMvc.perform(get("/api/admin/price-update-batches/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.items[0].id").value(100L))
                .andExpect(jsonPath("$.items[0].status").value("UPDATE"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldCreateManualBatch() throws Exception {
        var request = new PriceUpdateManualBatchRequest(
                10L, null,
                List.of(new PriceUpdateManualItemRequest("SUP-1", null, "Producto", BigDecimal.valueOf(5000))),
                null
        );
        when(service.createManual(any())).thenReturn(detailDto(1L));

        mockMvc.perform(post("/api/admin/price-update-batches/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldImportFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "prices.csv", "text/csv", "sku,cost\nSUP-1,5000\n".getBytes());
        when(service.importFile(eq(10L), any(), any(), eq(null)))
                .thenReturn(detailDto(1L));

        mockMvc.perform(multipart("/api/admin/price-update-batches/import")
                        .file(file)
                        .param("supplierId", "10"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldUpdateDefaults() throws Exception {
        var request = new PriceUpdateBatchDefaultsRequest(BigDecimal.valueOf(40), true, true, false);
        when(service.updateDefaults(eq(1L), any())).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/defaults")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldUpdateItem() throws Exception {
        var request = new PriceUpdateBatchItemUpdateRequest(
                null, null, null, null, null,
                BigDecimal.valueOf(30), null, null, null, null, null
        );
        when(service.updateItem(eq(1L), eq(100L), any())).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/items/100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldApplyDefaultsToAll() throws Exception {
        when(service.applyDefaultsToAll(1L)).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/apply-defaults-to-all")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldValidateBatch() throws Exception {
        when(service.validate(1L)).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldApplyBatch() throws Exception {
        when(service.apply(1L)).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldCancelBatch() throws Exception {
        when(service.cancel(1L)).thenReturn(detailDto(1L));

        mockMvc.perform(patch("/api/admin/price-update-batches/1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    void shouldRejectUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/admin/price-update-batches"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void shouldRejectNonAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/price-update-batches"))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private PriceUpdateBatchSummaryDto summaryDto(Long id, String supplierName) {
        return new PriceUpdateBatchSummaryDto(id, 10L, supplierName, PriceUpdateBatchType.MANUAL_GRID,
                PriceUpdateBatchStatus.DRAFT, null, now, null);
    }

    private PriceUpdateBatchDetailDto detailDto(Long id) {
        var item = new PriceUpdateBatchItemDto(100L, 200L, 300L, "Producto", "SUP-1",
                "Producto Proveedor", "779001", BigDecimal.valueOf(4800), BigDecimal.valueOf(5200),
                BigDecimal.valueOf(8.333), BigDecimal.valueOf(35), BigDecimal.valueOf(7500),
                BigDecimal.valueOf(8000), BigDecimal.valueOf(8000), true, true, false,
                PriceUpdateBatchItemStatus.UPDATE, null);
        return new PriceUpdateBatchDetailDto(id, 10L, "Distribuidora", PriceUpdateBatchType.MANUAL_GRID,
                PriceUpdateBatchStatus.DRAFT, null, BigDecimal.valueOf(35), true, true, true,
                null, now, null, List.of(item));
    }
}
