package com.dietetica.lembas.catalog.integration;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.catalog.dto.CategoryRequest;
import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.dto.ProductStatusUpdateRequest;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack catalog API tests backed by PostgreSQL and the real security filter chain.
 *
 * <p>These tests complement controller slice tests by exercising routing, JWT authentication,
 * services, repositories, Flyway schema, and JSON serialization together.</p>
 */
@AutoConfigureMockMvc
class CatalogAdminStoreIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private String adminToken;

    @BeforeEach
    void cleanDatabaseAndCreateAdmin() {
        productRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        User admin = userRepository.saveAndFlush(new User(
                null,
                "admin-it@lembas.com",
                passwordEncoder.encode("AdminPass!123"),
                "Admin",
                "Integration",
                null,
                Role.ADMIN
        ));
        adminToken = jwtTokenProvider.createAccessToken(admin);
    }

    @Nested
    class AdminProductFlow {

        @Test
        void Should_createAndPublishProduct_when_adminUsesCatalogApi() throws Exception {
            Long categoryId = createCategory("Integration Cereals");

            String createdProduct = mockMvc.perform(post("/api/admin/products")
                            .header("Authorization", bearer(adminToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(productRequest(
                                    "Organic Oats",
                                    "IT-ORG-OATS-1",
                                    categoryId,
                                    ProductOnlineStatus.DRAFT
                            ))))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Organic Oats"))
                    .andExpect(jsonPath("$.onlineStatus").value("DRAFT"))
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            Long productId = objectMapper.readTree(createdProduct).get("id").asLong();

            mockMvc.perform(patch("/api/admin/products/{id}/status", productId)
                            .header("Authorization", bearer(adminToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    new ProductStatusUpdateRequest(ProductOnlineStatus.PUBLISHED))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(productId))
                    .andExpect(jsonPath("$.onlineStatus").value("PUBLISHED"));

            mockMvc.perform(get("/api/store/products/{id}", productId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(productId))
                    .andExpect(jsonPath("$.name").value("Organic Oats"));

            assertThat(productRepository.findById(productId)).isPresent();
        }

        @Test
        void Should_rejectAdminProductCreation_when_tokenIsMissing() throws Exception {
            Long categoryId = createCategory("Protected Category");

            mockMvc.perform(post("/api/admin/products")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(productRequest(
                                    "Protected Product",
                                    "IT-PROTECTED-1",
                                    categoryId,
                                    ProductOnlineStatus.DRAFT
                            ))))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andExpect(jsonPath("$.path").value("/api/admin/products"));
        }
    }

    @Nested
    class PublicStoreContract {

        @Test
        void Should_exposeOnlyPublishedProducts_when_listingStoreCatalog() throws Exception {
            Long categoryId = createCategory("Store Visible Category");
            createProduct("Published Lembas", "IT-PUBLISHED-1", categoryId, ProductOnlineStatus.PUBLISHED);
            createProduct("Draft Lembas", "IT-DRAFT-1", categoryId, ProductOnlineStatus.DRAFT);

            mockMvc.perform(get("/api/store/products")
                            .param("q", "lembas")
                            .param("categoryId", categoryId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].name").value("Published Lembas"))
                    .andExpect(jsonPath("$.content[0].onlineStatus").value("PUBLISHED"));
        }

        @Test
        void Should_returnStablePageResponse_when_storeCatalogIsPaged() throws Exception {
            Long categoryId = createCategory("Paged Category");
            createProduct("Paged Product", "IT-PAGED-1", categoryId, ProductOnlineStatus.PUBLISHED);

            mockMvc.perform(get("/api/store/products")
                            .param("size", "5")
                            .param("page", "0"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.totalElements").exists())
                    .andExpect(jsonPath("$.totalPages").exists())
                    .andExpect(jsonPath("$.number").value(0))
                    .andExpect(jsonPath("$.size").value(5))
                    .andExpect(jsonPath("$.pageable").doesNotExist())
                    .andExpect(jsonPath("$.sort").doesNotExist());
        }
    }

    private Long createCategory(String name) throws Exception {
        String response = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CategoryRequest(
                                name,
                                null,
                                "Category created by integration tests"
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asLong();
    }

    private Long createProduct(
            String name,
            String barcode,
            Long categoryId,
            ProductOnlineStatus onlineStatus
    ) throws Exception {
        String response = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest(
                                name,
                                barcode,
                                categoryId,
                                onlineStatus
                        ))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("id").asLong();
    }

    private ProductRequest productRequest(
            String name,
            String barcode,
            Long categoryId,
            ProductOnlineStatus onlineStatus
    ) {
        return new ProductRequest(
                name,
                "Product created by integration tests",
                "Lembas Test Brand",
                barcode,
                categoryId,
                new BigDecimal("123.45"),
                2,
                "https://example.test/product.png",
                onlineStatus
        );
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
