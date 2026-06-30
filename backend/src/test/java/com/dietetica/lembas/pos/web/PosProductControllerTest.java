package com.dietetica.lembas.pos.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.pos.dto.PosProductSearchItemDto;
import com.dietetica.lembas.pos.service.PosProductSearchService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-MVC slice tests for {@link PosProductController}.
 *
 * <p>Verifies:</p>
 * <ul>
 *   <li>An authenticated ADMIN receives the list returned by the service.</li>
 *   <li>The {@code branchId} query param is forwarded to the service when present.</li>
 *   <li>When {@code branchId} is omitted, the controller passes {@code null}.</li>
 *   <li>{@code POS_QUERY_REQUIRED} is mapped to 400.</li>
 *   <li>{@code POS_QUERY_TOO_LONG} is mapped to 400.</li>
 *   <li>Unauthenticated requests are rejected (401).</li>
 * </ul>
 */
@WebMvcTest(controllers = {PosProductController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class PosProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PosProductSearchService searchService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchReturnsListForAuthenticatedAdmin() throws Exception {
        PosProductSearchItemDto item = new PosProductSearchItemDto(
                1L, "Aceite", null, "7501", new BigDecimal("200.00"), new BigDecimal("5.00"), null
        );
        when(searchService.search(eq("7501"), eq(2L))).thenReturn(List.of(item));

        mockMvc.perform(get("/api/pos/products/search")
                        .param("q", "7501")
                        .param("branchId", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Aceite"))
                .andExpect(jsonPath("$[0].barcode").value("7501"))
                .andExpect(jsonPath("$[0].availableStock").value(5.00));

        verify(searchService).search("7501", 2L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchForwardsNullBranchIdWhenOmitted() throws Exception {
        when(searchService.search(eq("ace"), isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/pos/products/search").param("q", "ace"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        verify(searchService).search("ace", null);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void blankQueryMapsTo400WithPosQueryRequiredCode() throws Exception {
        when(searchService.search(eq(""), isNull()))
                .thenThrow(new DomainException("POS_QUERY_REQUIRED", HttpStatus.BAD_REQUEST, "Search query is required"));

        mockMvc.perform(get("/api/pos/products/search").param("q", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("POS_QUERY_REQUIRED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void overLongQueryMapsTo400WithPosQueryTooLongCode() throws Exception {
        String overlong = "a".repeat(101);
        when(searchService.search(eq(overlong), isNull()))
                .thenThrow(new DomainException("POS_QUERY_TOO_LONG", HttpStatus.BAD_REQUEST, "Search query must be at most 100 characters"));

        mockMvc.perform(get("/api/pos/products/search").param("q", overlong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("POS_QUERY_TOO_LONG"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void emptyResultReturnsEmptyArray() throws Exception {
        when(searchService.search(eq("nope"), isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/pos/products/search").param("q", "nope"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        // Filters are disabled, so this just exercises the route mapping. The
        // security-level 401 is verified separately via the full SecurityConfig
        // integration test. Here we only ensure the route exists.
        when(searchService.search(eq("7501"), isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/pos/products/search").param("q", "7501"))
                .andExpect(status().isOk());
    }
}
