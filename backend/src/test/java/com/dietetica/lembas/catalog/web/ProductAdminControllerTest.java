package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.dto.ProductStatusUpdateRequest;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.service.ProductService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web slice tests for {@link ProductAdminController}.
 *
 * <p>Verifies that {@code @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")} is
 * enforced on every endpoint and that the controller correctly delegates to
 * {@link ProductService} for all CRUD operations.</p>
 *
 * <p>Authorization matrix for each endpoint:</p>
 * <ul>
 *   <li>ADMIN -> 200 OK / 201 CREATED / 204 NO CONTENT</li>
 *   <li>MANAGER -> 200 OK / 201 CREATED / 204 NO CONTENT</li>
 *   <li>EMPLOYEE -> 403 FORBIDDEN</li>
 *   <li>UNAUTHENTICATED -> 401 UNAUTHORIZED</li>
 * </ul>
 */
@WebMvcTest(controllers = {ProductAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class ProductAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProductService productService;

    // Required by the WebMvcTest slice even though filters are disabled.
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    // -------------------------------------------------------------------------
    // Shared test data
    // -------------------------------------------------------------------------

    private static final long PRODUCT_ID = 1L;
    private static final long CATEGORY_ID = 5L;

    private static ProductSummaryDto aSummary() {
        return new ProductSummaryDto(PRODUCT_ID, "Granola", "Lembas", "7790001",
                CATEGORY_ID, "Cereales", BigDecimal.valueOf(1200), 2,
                "/uploads/granola.jpg", ProductOnlineStatus.DRAFT);
    }

    private static ProductDetailDto aDetail() {
        return new ProductDetailDto(PRODUCT_ID, "Granola", "Granola artesanal",
                "Lembas", "7790001", CATEGORY_ID, "Cereales",
                BigDecimal.valueOf(1200), 2, "/uploads/granola.jpg",
                ProductOnlineStatus.DRAFT);
    }

    private static ProductRequest aValidCreateRequest() {
        return new ProductRequest("Granola", "Granola artesanal", "Lembas",
                "7790001", CATEGORY_ID, BigDecimal.valueOf(1200), 2,
                "/uploads/granola.jpg", ProductOnlineStatus.DRAFT);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // =========================================================================
    // GET /api/admin/products — paginated listing
    // =========================================================================

    @Nested
    class ListProducts {

        private static final String URL = "/api/admin/products";

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return200_when_adminListsProducts() throws Exception {
            Page<ProductSummaryDto> page = new PageImpl<>(
                    List.of(aSummary()), PageRequest.of(0, 10), 1);
            when(productService.listAdminProducts(isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content[0].id").value(PRODUCT_ID))
                    .andExpect(jsonPath("$.content[0].name").value("Granola"))
                    .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_forwardFilters_when_adminListsProducts() throws Exception {
            when(productService.listAdminProducts(eq("granola"), eq(CATEGORY_ID),
                    eq(ProductOnlineStatus.PUBLISHED), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get(URL)
                            .param("search", "granola")
                            .param("categoryId", String.valueOf(CATEGORY_ID))
                            .param("onlineStatus", "PUBLISHED"))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return200_when_managerListsProducts() throws Exception {
            when(productService.listAdminProducts(isNull(), isNull(), isNull(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

            mockMvc.perform(get(URL)).andExpect(status().isOk());
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeListsProducts() throws Exception {
            mockMvc.perform(get(URL)).andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserListsProducts() throws Exception {
            mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // GET /api/admin/products/{id} — product detail
    // =========================================================================

    @Nested
    class DetailProduct {

        private static final String URL = "/api/admin/products/" + PRODUCT_ID;

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return200_when_adminGetsDetail() throws Exception {
            when(productService.getDetail(PRODUCT_ID)).thenReturn(aDetail());

            mockMvc.perform(get(URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PRODUCT_ID))
                    .andExpect(jsonPath("$.name").value("Granola"))
                    .andExpect(jsonPath("$.categoryName").value("Cereales"));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return200_when_managerGetsDetail() throws Exception {
            when(productService.getDetail(PRODUCT_ID)).thenReturn(aDetail());

            mockMvc.perform(get(URL)).andExpect(status().isOk());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return404_when_productNotFound() throws Exception {
            when(productService.getDetail(999L))
                    .thenThrow(new DomainException("PRODUCT_NOT_FOUND",
                            HttpStatus.NOT_FOUND, "Product not found"));

            mockMvc.perform(get("/api/admin/products/999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeGetsDetail() throws Exception {
            mockMvc.perform(get(URL)).andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserGetsDetail() throws Exception {
            mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // POST /api/admin/products — create product
    // =========================================================================

    @Nested
    class CreateProduct {

        private static final String URL = "/api/admin/products";

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return201_when_adminCreatesProduct() throws Exception {
            when(productService.create(any(ProductRequest.class))).thenReturn(aDetail());

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(PRODUCT_ID))
                    .andExpect(jsonPath("$.name").value("Granola"));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return201_when_managerCreatesProduct() throws Exception {
            when(productService.create(any(ProductRequest.class))).thenReturn(aDetail());

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isCreated());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return400_when_invalidRequestBody() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return400_when_negativeSalePrice() throws Exception {
            String invalidJson = """
                    {
                        "name": "Granola",
                        "categoryId": 5,
                        "salePrice": -1,
                        "onlineStatus": "DRAFT"
                    }
                    """;

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidJson))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return409_when_duplicateBarcode() throws Exception {
            when(productService.create(any(ProductRequest.class)))
                    .thenThrow(new DomainException("PRODUCT_BARCODE_DUPLICATED",
                            HttpStatus.CONFLICT, "Product barcode already exists"));

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("PRODUCT_BARCODE_DUPLICATED"));
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeCreatesProduct() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserCreatesProduct() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // PUT /api/admin/products/{id} — update product
    // =========================================================================

    @Nested
    class UpdateProduct {

        private static final String URL = "/api/admin/products/" + PRODUCT_ID;

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return200_when_adminUpdatesProduct() throws Exception {
            when(productService.update(eq(PRODUCT_ID), any(ProductRequest.class)))
                    .thenReturn(aDetail());

            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PRODUCT_ID));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return200_when_managerUpdatesProduct() throws Exception {
            when(productService.update(eq(PRODUCT_ID), any(ProductRequest.class)))
                    .thenReturn(aDetail());

            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return400_when_updateHasInvalidBody() throws Exception {
            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return404_when_updatingNonExistentProduct() throws Exception {
            when(productService.update(eq(999L), any(ProductRequest.class)))
                    .thenThrow(new DomainException("PRODUCT_NOT_FOUND",
                            HttpStatus.NOT_FOUND, "Product not found"));

            mockMvc.perform(put("/api/admin/products/999")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeUpdatesProduct() throws Exception {
            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserUpdatesProduct() throws Exception {
            mockMvc.perform(put(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(aValidCreateRequest())))
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // DELETE /api/admin/products/{id} — soft-delete product
    // =========================================================================

    @Nested
    class DeleteProduct {

        private static final String URL = "/api/admin/products/" + PRODUCT_ID;

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return204_when_adminDeletesProduct() throws Exception {
            mockMvc.perform(delete(URL))
                    .andExpect(status().isNoContent());

            verify(productService).delete(PRODUCT_ID);
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return204_when_managerDeletesProduct() throws Exception {
            mockMvc.perform(delete(URL))
                    .andExpect(status().isNoContent());

            verify(productService).delete(PRODUCT_ID);
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return404_when_deletingNonExistentProduct() throws Exception {
            doThrow(new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND,
                    "Product not found"))
                    .when(productService).delete(999L);

            mockMvc.perform(delete("/api/admin/products/999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeDeletesProduct() throws Exception {
            mockMvc.perform(delete(URL)).andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserDeletesProduct() throws Exception {
            mockMvc.perform(delete(URL)).andExpect(status().isUnauthorized());
        }
    }

    // =========================================================================
    // PATCH /api/admin/products/{id}/status — change online status
    // =========================================================================

    @Nested
    class ChangeProductStatus {

        private static final String URL = "/api/admin/products/" + PRODUCT_ID + "/status";

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return200_when_adminChangesStatus() throws Exception {
            when(productService.changeOnlineStatus(eq(PRODUCT_ID),
                    eq(ProductOnlineStatus.PUBLISHED)))
                    .thenReturn(aSummary());

            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PRODUCT_ID));
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        void Should_return200_when_managerChangesStatus() throws Exception {
            when(productService.changeOnlineStatus(eq(PRODUCT_ID),
                    eq(ProductOnlineStatus.PUBLISHED)))
                    .thenReturn(aSummary());

            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return400_when_statusRequestHasNoStatus() throws Exception {
            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return409_when_statusTransitionIsInvalid() throws Exception {
            when(productService.changeOnlineStatus(eq(PRODUCT_ID),
                    eq(ProductOnlineStatus.HIDDEN)))
                    .thenThrow(new DomainException("PRODUCT_STATUS_INVALID_TRANSITION",
                            HttpStatus.CONFLICT, "Product status transition is not allowed"));

            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.HIDDEN))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("PRODUCT_STATUS_INVALID_TRANSITION"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        void Should_return404_when_changingStatusOnNonExistentProduct() throws Exception {
            when(productService.changeOnlineStatus(eq(999L), eq(ProductOnlineStatus.PUBLISHED)))
                    .thenThrow(new DomainException("PRODUCT_NOT_FOUND",
                            HttpStatus.NOT_FOUND, "Product not found"));

            mockMvc.perform(patch("/api/admin/products/999/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        }

        @Test
        @WithMockUser(roles = "EMPLOYEE")
        void Should_return403_when_employeeChangesStatus() throws Exception {
            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isForbidden());
        }

        @Test
        void Should_return401_when_unauthenticatedUserChangesStatus() throws Exception {
            mockMvc.perform(patch(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isUnauthorized());
        }
    }
}
