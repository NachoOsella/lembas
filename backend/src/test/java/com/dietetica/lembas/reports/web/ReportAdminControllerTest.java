package com.dietetica.lembas.reports.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.reports.dto.CashMethodTotalDto;
import com.dietetica.lembas.reports.dto.CashOverviewDailyDto;
import com.dietetica.lembas.reports.dto.CashOverviewDto;
import com.dietetica.lembas.reports.dto.CashReportDto;
import com.dietetica.lembas.reports.dto.CashSessionHistoryDto;
import com.dietetica.lembas.reports.dto.CashSessionSummaryDto;
import com.dietetica.lembas.reports.dto.DashboardDto;
import com.dietetica.lembas.reports.dto.DashboardStatCardDto;
import com.dietetica.lembas.reports.service.ReportService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and endpoint tests for the report REST controllers.
 */
@WebMvcTest(controllers = {ReportAdminController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class ReportAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReportService reportService;
    @MockitoBean
    private SecurityContextHelper securityContextHelper;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void dashboardReturns200ForAdmin() throws Exception {
        when(reportService.getDashboard(any(), eq(null)))
                .thenReturn(sampleDashboard());

        mockMvc.perform(get("/api/admin/reports/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reportDate").value("2026-07-13"))
                .andExpect(jsonPath("$.todaySales.value").value("$ 45.230"))
                .andExpect(jsonPath("$.topProducts").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void dashboardAcceptsDateAndBranch() throws Exception {
        when(reportService.getDashboard(any(LocalDate.class), eq(3L)))
                .thenReturn(sampleDashboard());

        mockMvc.perform(get("/api/admin/reports/dashboard")
                        .param("date", "2026-07-13")
                        .param("branchId", "3"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void cashOverviewReturnsRawOperationalFacts() throws Exception {
        when(reportService.getCashOverview(any(), any(), eq(null))).thenReturn(sampleCashOverview());

        mockMvc.perform(get("/api/admin/reports/cash-overview")
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-13"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closedSessions").value(12))
                .andExpect(jsonPath("$.expectedCashTotal").value(4500))
                .andExpect(jsonPath("$.dailyCloseSeries[0].date").value("2026-07-13"))
                .andExpect(jsonPath("$.paymentMethods[0].method").value("CASH"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void cashSessionHistoryReturns200() throws Exception {
        when(reportService.getCashSessionHistory(
                any(), any(), any(), any(), any(), any(), anyInt(), anyInt(), any()))
                .thenReturn(new CashSessionHistoryDto(
                        List.of(new CashSessionSummaryDto(
                                1L, 1L, "Centro", "Juan", null,
                                OffsetDateTime.parse("2026-07-13T09:00:00Z"),
                                null,
                                new BigDecimal("100.00"),
                                null, null, null, null,
                                com.dietetica.lembas.cash.model.CashSessionStatus.OPEN,
                                0, 0)),
                        1, 0, 20));

        mockMvc.perform(get("/api/admin/reports/cash-sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.sessions[0].id").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void cashSessionDetailReturns200() throws Exception {
        when(reportService.getCashReport(7L))
                .thenReturn(sampleCashReport(7L));

        mockMvc.perform(get("/api/admin/reports/cash-session/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(7))
                .andExpect(jsonPath("$.totalTransactions").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void cashSessionDetailMapsNotFoundTo404() throws Exception {
        when(reportService.getCashReport(99L))
                .thenThrow(new com.dietetica.lembas.shared.exception.DomainException(
                        "CASH_SESSION_NOT_FOUND",
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Cash session not found"));

        mockMvc.perform(get("/api/admin/reports/cash-session/99"))
                .andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private DashboardDto sampleDashboard() {
        DashboardStatCardDto card = new DashboardStatCardDto(
                "Ventas del dia", "$ 45.230", "Sub", "UP", new BigDecimal("12.5"),
                "pi pi-shopping-cart", "SUCCESS", null, null);
        return new DashboardDto(
                LocalDate.parse("2026-07-13"), null, null, OffsetDateTime.now(),
                card, card, card, card, card, card, card, card, card, card,
                List.of(),
                List.of(),
                List.of(),
                new BigDecimal("12.5"), new BigDecimal("8.0"), new BigDecimal("3.0")
        );
    }

    private CashOverviewDto sampleCashOverview() {
        return new CashOverviewDto(
                LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-13"), null, null,
                OffsetDateTime.now(), 12, 1, 10, 2,
                new BigDecimal("4500.00"), new BigDecimal("4490.00"),
                new BigDecimal("-10.00"), new BigDecimal("30.00"),
                List.of(new CashOverviewDailyDto(
                        LocalDate.parse("2026-07-13"), 2,
                        new BigDecimal("800.00"), new BigDecimal("790.00"), new BigDecimal("-10.00"))),
                List.of(new CashMethodTotalDto("CASH", new BigDecimal("3200.00"), 20)),
                List.of()
        );
    }

    private CashReportDto sampleCashReport(Long id) {
        return new CashReportDto(
                id, 1L, "Centro",
                1L, "Juan", 2L, "Maria",
                OffsetDateTime.parse("2026-07-13T09:00:00Z"),
                OffsetDateTime.parse("2026-07-13T19:00:00Z"),
                com.dietetica.lembas.cash.model.CashSessionStatus.CLOSED,
                new BigDecimal("100.00"),
                new BigDecimal("450.00"),
                new BigDecimal("455.00"),
                new BigDecimal("5.00"),
                "Sobrante",
                null, null,
                com.dietetica.lembas.cash.dto.CashTotalsByMethodDto.empty(),
                2, 2, new BigDecimal("450.00"),
                List.of(), List.of(),
                OffsetDateTime.now()
        );
    }

    private static <T> T anyOf(Class<T> type) {
        return org.mockito.ArgumentMatchers.any(type);
    }
}
