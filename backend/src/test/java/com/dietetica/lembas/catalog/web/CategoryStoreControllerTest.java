package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.catalog.dto.CategoryStoreDto;
import com.dietetica.lembas.catalog.service.CategoryService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web slice tests for {@link CategoryStoreController}.
 *
 * <p>The public catalog category endpoint is the storefront's only way to
 * populate the category filter, so it must:</p>
 * <ul>
 *   <li>Be reachable without authentication.</li>
 *   <li>Return a sorted, deduplicated list with a published-product count.</li>
 *   <li>Not leak the admin payload (no description, no parent metadata).</li>
 * </ul>
 */
@WebMvcTest(controllers = {CategoryStoreController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class CategoryStoreControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoryService categoryService;

    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private LembasUserDetailsService userDetailsService;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    // -------------------------------------------------------------------------
    // GET /api/store/categories
    // -------------------------------------------------------------------------

    @Test
    void Should_return200AndCategoryList_when_anonymousUserRequestsCategories() throws Exception {
        when(categoryService.listStoreCategories()).thenReturn(List.of(
                new CategoryStoreDto(1L, "Cereales", 12L),
                new CategoryStoreDto(2L, "Bebidas", 8L)
        ));

        mockMvc.perform(get("/api/store/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Cereales"))
                .andExpect(jsonPath("$[0].productCount").value(12))
                .andExpect(jsonPath("$[1].name").value("Bebidas"))
                .andExpect(jsonPath("$[1].productCount").value(8));
    }

    @Test
    void Should_return200WithEmptyArray_when_storeHasNoPublishedCategories() throws Exception {
        when(categoryService.listStoreCategories()).thenReturn(List.of());

        mockMvc.perform(get("/api/store/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void Should_notExposeAdminFieldsInResponse() throws Exception {
        when(categoryService.listStoreCategories()).thenReturn(List.of(
                new CategoryStoreDto(5L, "Suplementos", 4L)
        ));

        // The store DTO is a strict subset of the admin DTO: id, name, productCount.
        // Description, parentId, etc. must never reach the public client.
        mockMvc.perform(get("/api/store/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].description").doesNotExist())
                .andExpect(jsonPath("$[0].parentId").doesNotExist())
                .andExpect(jsonPath("$[0].parentName").doesNotExist());
    }

    @Test
    void Should_routeToStoreServiceOnly_when_publicCategoriesAreRequested() throws Exception {
        when(categoryService.listStoreCategories()).thenReturn(List.of());

        mockMvc.perform(get("/api/store/categories")).andExpect(status().isOk());

        // The public endpoint must use the store-only service method; the
        // admin listing would expose the full CategoryDto payload.
        verify(categoryService).listStoreCategories();
        verify(categoryService, never()).listAdminCategories();
        verify(categoryService, never()).searchCategories(org.mockito.ArgumentMatchers.any());
    }
}
