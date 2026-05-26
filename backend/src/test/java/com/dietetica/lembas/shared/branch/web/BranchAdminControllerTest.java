package com.dietetica.lembas.shared.branch.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.branch.dto.BranchResponse;
import com.dietetica.lembas.shared.branch.service.BranchService;
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

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and routing tests for {@link BranchAdminController}.
 */
@WebMvcTest(controllers = {BranchAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class BranchAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BranchService branchService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Verifies that the admin branches endpoint is registered and returns selector data.
     */
    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_returnBranches_when_adminListsBranches() throws Exception {
        when(branchService.listActiveBranches())
                .thenReturn(List.of(new BranchResponse(1L, "Centro", "Main 123", "555-0001", true)));

        mockMvc.perform(get("/api/admin/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].name").value("Centro"));
    }

    /**
     * Verifies that non-admin internal users cannot access branch selector data.
     */
    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_nonAdminListsBranches() throws Exception {
        mockMvc.perform(get("/api/admin/branches"))
                .andExpect(status().isForbidden());
    }
}
