package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.service.ProductService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web slice tests for {@link ProductStoreController}.
 *
 * <p>Covers the public storefront endpoints exposed under
 * {@code /api/store/products}: the published catalog listing, the
 * published-only product detail, the featured carousel, and the
 * related products lookup. Authorization is bypassed
 * ({@code addFilters = false}) because the controller has no
 * {@code @PreAuthorize} and is meant to be reached anonymously per
 * {@code SecurityConfig}. The published filter is asserted indirectly
 * by verifying that the controller routes every read through
 * {@link ProductService#listStoreProducts}, {@code getStoreProductDetail},
 * {@code listRandomPublishedProducts} and {@code listRandomRelatedProducts}
 * (the public-only service methods that hardcode the {@code PUBLISHED}
 * status in their queries).</p>
 */
@WebMvcTest(controllers = {ProductStoreController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class ProductStoreControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    // JWT/security collaborators required to wire the slice.
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private LembasUserDetailsService userDetailsService;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    // -------------------------------------------------------------------------
    // GET /api/store/products  — public listing
    // -------------------------------------------------------------------------

    @Test
    void Should_return200AndPublishedPage_when_anonymousUserListsProducts() throws Exception {
        Page<ProductSummaryDto> page = new PageImpl<>(
                List.of(aSummary(1L), aSummary(2L)),
                PageRequest.of(0, 20),
                2
        );
        when(productService.listStoreProducts(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Granola 1"))
                .andExpect(jsonPath("$.content[0].onlineStatus").value("PUBLISHED"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void Should_forwardSearchAndCategoryParamsToService_when_filteringProducts() throws Exception {
        when(productService.listStoreProducts(eq("granola"), eq(3L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/store/products")
                        .param("q", "granola")
                        .param("categoryId", "3"))
                .andExpect(status().isOk());

        verify(productService).listStoreProducts(eq("granola"), eq(3L), any(Pageable.class));
    }

    @Test
    void Should_callStoreListingOnly_when_publicListIsInvoked() throws Exception {
        // Defence in depth: the public list must NEVER route to the admin
        // listing — that's the contract that hides drafts from the store.
        when(productService.listStoreProducts(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/store/products")).andExpect(status().isOk());

        verify(productService, never()).listAdminProducts(any(), any(), any(), any());
    }

    @Test
    void Should_forwardBlankSearchToService_whichNormalizesIt() throws Exception {
        // The controller is a thin pass-through: the blank value is forwarded
        // verbatim. The service layer is responsible for the null-coercion
        // (covered separately in ProductServiceTest).
        when(productService.listStoreProducts(eq("   "), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/store/products").param("q", "   "))
                .andExpect(status().isOk());

        verify(productService).listStoreProducts(eq("   "), isNull(), any(Pageable.class));
    }

    // -------------------------------------------------------------------------
    // GET /api/store/products/{id}  — public detail
    // -------------------------------------------------------------------------

    @Test
    void Should_return200_when_anonymousUserRequestsPublishedProduct() throws Exception {
        when(productService.getStoreProductDetail(7L))
                .thenReturn(aDetail(7L));

        mockMvc.perform(get("/api/store/products/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.onlineStatus").value("PUBLISHED"))
                .andExpect(jsonPath("$.salePrice").value(2500))
                .andExpect(jsonPath("$.categoryName").value("Cereales"));
    }

    @Test
    void Should_return404_when_productIsNotPublished() throws Exception {
        when(productService.getStoreProductDetail(99L))
                .thenThrow(new DomainException(
                        "PRODUCT_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Product not found"));

        mockMvc.perform(get("/api/store/products/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    // -------------------------------------------------------------------------
    // GET /api/store/products/featured
    // -------------------------------------------------------------------------

    @Test
    void Should_return200_when_anonymousUserRequestsFeatured() throws Exception {
        when(productService.listRandomPublishedProducts())
                .thenReturn(new PageImpl<>(
                        List.of(aSummary(11L), aSummary(12L), aSummary(13L)),
                        PageRequest.of(0, 15),
                        3));

        mockMvc.perform(get("/api/store/products/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3));
    }

    // -------------------------------------------------------------------------
    // GET /api/store/products/{id}/related
    // -------------------------------------------------------------------------

    @Test
    void Should_return200_when_anonymousUserRequestsRelated() throws Exception {
        when(productService.listRandomRelatedProducts(5L))
                .thenReturn(new PageImpl<>(
                        List.of(aSummary(6L), aSummary(7L)),
                        PageRequest.of(0, 6),
                        2));

        mockMvc.perform(get("/api/store/products/5/related"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(6));
    }

    @Test
    void Should_return404_when_relatedTargetProductDoesNotExist() throws Exception {
        when(productService.listRandomRelatedProducts(404L))
                .thenThrow(new DomainException(
                        "PRODUCT_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Product not found"));

        mockMvc.perform(get("/api/store/products/404/related"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    // -------------------------------------------------------------------------
    // Stock availability is intentionally out of scope for the initial catalog.
    // -------------------------------------------------------------------------

    @Test
    void Should_notExposeAvailableStockUntilInventoryIsImplemented() throws Exception {
        when(productService.listStoreProducts(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(aSummary(1L)), PageRequest.of(0, 20), 1));
        when(productService.getStoreProductDetail(1L)).thenReturn(aDetail(1L));

        // TODO: Replace this assertion when inventory exposes branch-level stock.
        // The initial public catalog must not invent or hardcode availability.
        mockMvc.perform(get("/api/store/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].availableStock").doesNotExist());

        mockMvc.perform(get("/api/store/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableStock").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static ProductSummaryDto aSummary(long id) {
        return new ProductSummaryDto(
                id,
                "Granola " + id,
                "Lembas",
                "779000000" + id,
                1L,
                "Cereales",
                BigDecimal.valueOf(2500),
                3,
                "/uploads/granola-" + id + ".jpg",
                ProductOnlineStatus.PUBLISHED
        );
    }

    private static ProductDetailDto aDetail(long id) {
        return new ProductDetailDto(
                id,
                "Granola " + id,
                "Granola artesanal sin azucar agregada.",
                "Lembas",
                "779000000" + id,
                1L,
                "Cereales",
                BigDecimal.valueOf(2500),
                3,
                "/uploads/granola-" + id + ".jpg",
                ProductOnlineStatus.PUBLISHED
        );
    }
}
