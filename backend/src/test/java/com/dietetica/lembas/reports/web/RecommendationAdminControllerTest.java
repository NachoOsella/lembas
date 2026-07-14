package com.dietetica.lembas.reports.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.reports.dto.RecommendationDto;
import com.dietetica.lembas.reports.service.RecommendationService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and endpoint tests for the recommendation REST controller.
 */
@WebMvcTest(controllers = {RecommendationAdminController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(SecurityConfigForTest.class)
class RecommendationAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecommendationService recommendationService;
    @MockitoBean
    private SecurityContextHelper securityContextHelper;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void recommendationsReturn403ForEmployee() throws Exception {
        mockMvc.perform(get("/api/admin/recommendations"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void recommendationsReturns200() throws Exception {
        when(recommendationService.getRecommendations(any(), any(), any(), any(), any()))
                .thenReturn(List.of(sample("LOW_STOCK-1", "LOW_STOCK")));

        mockMvc.perform(get("/api/admin/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("LOW_STOCK-1"))
                .andExpect(jsonPath("$[0].type").value("LOW_STOCK"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void recommendationsAcceptsFilters() throws Exception {
        when(recommendationService.getRecommendations(any(), any(), any(), any(), any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/admin/recommendations")
                        .param("type", "LOW_STOCK")
                        .param("minUrgency", "HIGH")
                        .param("limit", "5"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void recommendationsMapsInvalidTypeTo400() throws Exception {
        when(recommendationService.getRecommendations(any(), any(), any(), any(), any()))
                .thenThrow(new com.dietetica.lembas.shared.exception.DomainException(
                        "INVALID_TYPE",
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "type must be one of ..."));

        mockMvc.perform(get("/api/admin/recommendations")
                        .param("type", "NOPE"))
                .andExpect(status().isBadRequest());
    }

    private RecommendationDto sample(String id, String type) {
        return new RecommendationDto(
                id, type, "Sample", "Description", "HIGH",
                "pi pi-exclamation-triangle",
                "/admin/inventory/product/1/lots", "Ver producto",
                1L, "Granola", 1L, "Categoria", "12345",
                java.math.BigDecimal.ZERO, 10,
                null, null, null, null,
                null, null,
                OffsetDateTime.now()
        );
    }
}
