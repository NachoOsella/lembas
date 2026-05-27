package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.catalog.dto.CategoryDto;
import com.dietetica.lembas.catalog.dto.CategoryRequest;
import com.dietetica.lembas.catalog.service.CategoryService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and routing test for {@link CategoryAdminController}.
 *
 * <p>Verifies that {@code @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")} is
 * enforced on every endpoint:</p>
 * <ul>
 *   <li>ADMIN -> 200 OK / 201 CREATED</li>
 *   <li>MANAGER -> 200 OK / 201 CREATED</li>
 *   <li>EMPLOYEE -> 403 FORBIDDEN</li>
 *   <li>UNAUTHENTICATED -> 401 UNAUTHORIZED</li>
 * </ul>
 */
@WebMvcTest(controllers = {CategoryAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class CategoryAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CategoryService categoryService;

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
    void Should_return200_when_adminListsCategories() throws Exception {
        when(categoryService.listAdminCategories()).thenReturn(List.of(aCategoryDto()));

        mockMvc.perform(get("/api/admin/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminSearchesCategories() throws Exception {
        when(categoryService.searchCategories("cereal")).thenReturn(List.of(aCategoryDto()));

        mockMvc.perform(get("/api/admin/categories").param("search", "cereal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminCreatesCategory() throws Exception {
        when(categoryService.create(any(CategoryRequest.class))).thenReturn(aCategoryDto());

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminUpdatesCategory() throws Exception {
        when(categoryService.update(eq(1L), any(CategoryRequest.class))).thenReturn(aCategoryDto());

        mockMvc.perform(put("/api/admin/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return204_when_adminDeletesCategory() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/1"))
                .andExpect(status().isNoContent());
    }

    // -------------------------------------------------------------------------
    // MANAGER — all endpoints should succeed (same access as ADMIN)
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerListsCategories() throws Exception {
        when(categoryService.listAdminCategories()).thenReturn(List.of(aCategoryDto()));

        mockMvc.perform(get("/api/admin/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerSearchesCategories() throws Exception {
        when(categoryService.searchCategories("yerba")).thenReturn(List.of(aCategoryDto()));

        mockMvc.perform(get("/api/admin/categories").param("search", "yerba"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return201_when_managerCreatesCategory() throws Exception {
        when(categoryService.create(any(CategoryRequest.class))).thenReturn(aCategoryDto());

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerUpdatesCategory() throws Exception {
        when(categoryService.update(eq(1L), any(CategoryRequest.class))).thenReturn(aCategoryDto());

        mockMvc.perform(put("/api/admin/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Cereales"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return204_when_managerDeletesCategory() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/1"))
                .andExpect(status().isNoContent());
    }

    // -------------------------------------------------------------------------
    // EMPLOYEE — all endpoints should be forbidden
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeListsCategories() throws Exception {
        mockMvc.perform(get("/api/admin/categories"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeCreatesCategory() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeUpdatesCategory() throws Exception {
        mockMvc.perform(put("/api/admin/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeDeletesCategory() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/1"))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // UNAUTHENTICATED — all endpoints should return 401
    // -------------------------------------------------------------------------

    @Test
    void Should_return401_when_unauthenticatedUserListsCategories() throws Exception {
        mockMvc.perform(get("/api/admin/categories"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserCreatesCategory() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserUpdatesCategory() throws Exception {
        mockMvc.perform(put("/api/admin/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void Should_return401_when_unauthenticatedUserDeletesCategory() throws Exception {
        mockMvc.perform(delete("/api/admin/categories/1"))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Validation errors
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_adminSendsInvalidCreateRequest() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
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
    void Should_return409_when_adminCreatesDuplicateCategoryName() throws Exception {
        when(categoryService.create(any(CategoryRequest.class)))
                .thenThrow(new DomainException(
                        "CATEGORY_NAME_DUPLICATED",
                        HttpStatus.CONFLICT,
                        "Category name already exists at this level"
                ));

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_NAME_DUPLICATED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return409_when_adminDeletesCategoryWithChildren() throws Exception {
        org.mockito.Mockito.doThrow(new DomainException(
                "CATEGORY_HAS_CHILDREN",
                HttpStatus.CONFLICT,
                "Cannot delete category: it has child categories"
        )).when(categoryService).delete(1L);

        mockMvc.perform(delete("/api/admin/categories/1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_HAS_CHILDREN"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return404_when_adminUpdatesNonexistentCategory() throws Exception {
        when(categoryService.update(eq(999L), any(CategoryRequest.class)))
                .thenThrow(new DomainException(
                        "CATEGORY_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Category not found"
                ));

        mockMvc.perform(put("/api/admin/categories/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CATEGORY_NOT_FOUND"));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static CategoryRequest validCreateRequest() {
        return new CategoryRequest("Cereales", null, "Integrales y granolas");
    }

    private static CategoryDto aCategoryDto() {
        return new CategoryDto(1L, null, "Cereales", "Integrales y granolas");
    }
}
