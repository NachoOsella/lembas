package com.dietetica.lembas.users.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.dto.CreateInternalUserRequest;
import com.dietetica.lembas.users.dto.UserResponse;
import com.dietetica.lembas.users.dto.UserStatusRequest;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.service.UserAdminService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization test for {@link UserAdminController}.
 *
 * <p>Verifies that {@code @PreAuthorize("hasRole('ADMIN')")} is enforced on every
 * endpoint:
 * <ul>
 *   <li>ADMIN -> 200 OK / 201 CREATED</li>
 *   <li>MANAGER -> 403 FORBIDDEN</li>
 *   <li>EMPLOYEE -> 403 FORBIDDEN</li>
 *   <li>UNAUTHENTICATED -> 401 UNAUTHORIZED</li>
 * </ul>
 */
@WebMvcTest(controllers = {UserAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class UserAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserAdminService userAdminService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // -------------------------------------------------------------------------
    // ADMIN — all endpoints should succeed
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsUsers() throws Exception {
        when(userAdminService.listUsers(isNull(), isNull(), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(anAdminResponse())));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_passSearchParam_when_adminListsUsersWithSearch() throws Exception {
        when(userAdminService.listUsers(isNull(), isNull(), eq("gandalf"), any()))
                .thenReturn(new PageImpl<>(List.of(anAdminResponse())));

        mockMvc.perform(get("/api/admin/users").param("search", "gandalf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminCreatesUser() throws Exception {
        when(userAdminService.createUser(any(CreateInternalUserRequest.class)))
                .thenReturn(anAdminResponse());

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("admin@lembas.com"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminUpdatesUser() throws Exception {
        when(userAdminService.updateUser(eq(1L), any()))
                .thenReturn(anAdminResponse());

        mockMvc.perform(put("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\": \"Updated\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@lembas.com"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminPartiallyUpdatesUser() throws Exception {
        when(userAdminService.updateUser(eq(1L), any()))
                .thenReturn(anAdminResponse());

        mockMvc.perform(patch("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validUpdateRequest()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@lembas.com"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminUpdatesUserStatus() throws Exception {
        when(userAdminService.updateUserStatus(eq(1L), any(UserStatusRequest.class)))
                .thenReturn(anAdminResponse());

        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    // -------------------------------------------------------------------------
    // MANAGER — all endpoints should be forbidden
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_managerListsUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_managerCreatesUser() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_managerUpdatesUser() throws Exception {
        mockMvc.perform(put("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\": \"Updated\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_managerPartiallyUpdatesUser() throws Exception {
        mockMvc.perform(patch("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validUpdateRequest()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return403_when_managerUpdatesUserStatus() throws Exception {
        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // EMPLOYEE — all endpoints should be forbidden
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeListsUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeCreatesUser() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeUpdatesUser() throws Exception {
        mockMvc.perform(put("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\": \"Updated\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeUpdatesUserStatus() throws Exception {
        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // UNAUTHENTICATED — all endpoints should return 401
    // (the filter chain would normally reject before @PreAuthorize,
    // but with addFilters=false the AOP interceptor throws
    // AuthenticationCredentialsNotFoundException which maps to 401)
    // -------------------------------------------------------------------------

    @Test
    void Should_return401_when_unauthenticatedUserListsUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserCreatesUser() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserUpdatesUser() throws Exception {
        mockMvc.perform(put("/api/admin/users/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\": \"Updated\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserUpdatesUserStatus() throws Exception {
        mockMvc.perform(patch("/api/admin/users/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\": false}"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Validation errors (still applies to ADMIN)
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_adminSendsInvalidCreateRequest() throws Exception {
        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // -------------------------------------------------------------------------
    // Domain errors
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return409_when_adminCreatesDuplicateEmail() throws Exception {
        when(userAdminService.createUser(any(CreateInternalUserRequest.class)))
                .thenThrow(new DomainException(
                        "EMAIL_DUPLICATED",
                        HttpStatus.CONFLICT,
                        "A user with this email address already exists"
                ));

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_DUPLICATED"));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static CreateInternalUserRequest validCreateRequest() {
        return new CreateInternalUserRequest(
                "admin@lembas.com",
                "Str0ng!Pass",
                "Admin",
                "User",
                null,
                Role.ADMIN,
                null
        );
    }

    private static String validUpdateRequest() {
        return "{\"firstName\": \"Updated\"}";
    }

    private static UserResponse anAdminResponse() {
        return new UserResponse(
                1L,
                "admin@lembas.com",
                "Admin",
                "User",
                null,
                Role.ADMIN,
                null,
                true,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z")
        );
    }
}
