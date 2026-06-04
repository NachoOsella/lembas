package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.inventory.dto.StockLotResponse;
import com.dietetica.lembas.inventory.service.StockLotService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for {@link StockLotAdminController}. */
@WebMvcTest(controllers = {StockLotAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class StockLotAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StockLotService stockLotService;

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
        when(stockLotService.listLots(isNull(), isNull(), eq(false), any(Pageable.class)))
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
        when(stockLotService.listLots(eq(10L), eq(20L), eq(true), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/admin/stock/lots")
                        .param("productId", "10")
                        .param("branchId", "20")
                        .param("expiringSoon", "true"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return200_when_employeeListsLots() throws Exception {
        when(stockLotService.listLots(isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/admin/stock/lots"))
                .andExpect(status().isOk());
    }

    @Test
    void Should_return401_when_unauthenticatedUserListsLots() throws Exception {
        mockMvc.perform(get("/api/admin/stock/lots"))
                .andExpect(status().isUnauthorized());
    }

    /** Creates a stock lot response used by controller tests. */
    private StockLotResponse aLot() {
        return new StockLotResponse(
                1L,
                10L,
                "Granola",
                20L,
                "Centro",
                BigDecimal.valueOf(3.5),
                "L-001",
                LocalDate.of(2026, 12, 31),
                BigDecimal.valueOf(500)
        );
    }
}
