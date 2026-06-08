package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.dto.StockDeductionRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.service.InventoryService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for {@link StockLotAdminController}. */
@WebMvcTest(controllers = {StockLotAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class StockLotAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InventoryService inventoryService;

    // Required by the WebMvcTest slice even though filters are disabled.
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsLots() throws Exception {
        when(inventoryService.listLots(isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(aLot()), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/stock/lots"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].productName").value("Granola"))
                .andExpect(jsonPath("$.content[0].branchName").value("Centro"))
                .andExpect(jsonPath("$.content[0].quantityAvailable").value(3.5))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_forwardFilters_when_managerListsLots() throws Exception {
        when(inventoryService.listLots(eq(10L), eq(20L), eq(true), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/admin/stock/lots")
                        .param("productId", "10")
                        .param("branchId", "20")
                        .param("expiringSoon", "true"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminCreatesLot() throws Exception {
        CreateStockLotRequest request = new CreateStockLotRequest(
                10L, 20L, BigDecimal.valueOf(3.5), "L-001", LocalDate.now().plusDays(30), BigDecimal.valueOf(500));
        when(inventoryService.createStockLot(any(CreateStockLotRequest.class))).thenReturn(aLot());

        mockMvc.perform(post("/api/admin/stock/lots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.totalAvailableForProductBranch").value(8.5));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_createLotHasInvalidQuantity() throws Exception {
        String invalidJson = """
                {
                    "productId": 10,
                    "branchId": 20,
                    "quantity": 0,
                    "expirationDate": "2099-01-01"
                }
                """;

        mockMvc.perform(post("/api/admin/stock/lots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_createLotHasPastExpirationDate() throws Exception {
        String invalidJson = """
                {
                    "productId": 10,
                    "branchId": 20,
                    "quantity": 1,
                    "expirationDate": "2000-01-01"
                }
                """;

        mockMvc.perform(post("/api/admin/stock/lots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return200_when_employeeListsLots() throws Exception {
        when(inventoryService.listLots(isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/admin/stock/lots"))
                .andExpect(status().isOk());
    }

    @Test
    void Should_return401_when_unauthenticatedUserListsLots() throws Exception {
        mockMvc.perform(get("/api/admin/stock/lots"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminDeductsStock() throws Exception {
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(1L, BigDecimal.valueOf(3), BigDecimal.valueOf(10), BigDecimal.valueOf(7))),
                BigDecimal.valueOf(3), BigDecimal.valueOf(10), true
        );
        when(inventoryService.deductStock(eq(10L), eq(20L), eq(BigDecimal.valueOf(3)), eq(StockMovementType.MANUAL_ADJUSTMENT)))
                .thenReturn(plan);

        String json = """
                {"productId": 10, "branchId": 20, "quantity": 3}
                """;

        mockMvc.perform(post("/api/admin/stock/deductions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].stockLotId").value(1L))
                .andExpect(jsonPath("$.entries[0].quantityToDeduct").value(3))
                .andExpect(jsonPath("$.totalRequested").value(3));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_deductionHasInvalidQuantity() throws Exception {
        String invalidJson = """
                {"productId": 10, "branchId": 20, "quantity": -5}
                """;

        mockMvc.perform(post("/api/admin/stock/deductions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return200_when_employeeDeductsStock() throws Exception {
        DeductionPlan plan = new DeductionPlan(List.of(), BigDecimal.ZERO, BigDecimal.ZERO, false);
        when(inventoryService.deductStock(eq(10L), eq(20L), eq(BigDecimal.valueOf(1)), eq(StockMovementType.MANUAL_ADJUSTMENT)))
                .thenReturn(plan);

        String json = "{\"productId\": 10, \"branchId\": 20, \"quantity\": 1}";
        mockMvc.perform(post("/api/admin/stock/deductions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    /** Creates a stock lot response used by controller tests. */
    private StockLotDto aLot() {
        return new StockLotDto(
                1L,
                10L,
                "Granola",
                20L,
                "Centro",
                BigDecimal.valueOf(3.5),
                BigDecimal.valueOf(3.5),
                "L-001",
                LocalDate.of(2099, 12, 31),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(500),
                "ACTIVE",
                null,
                null,
                null,
                null,
                BigDecimal.valueOf(8.5)
        );
    }
}
