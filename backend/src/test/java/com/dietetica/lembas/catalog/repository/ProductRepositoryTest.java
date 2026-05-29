package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** PostgreSQL-backed persistence tests for admin product catalog queries. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    /** Verifies the nullable search parameter is typed correctly in PostgreSQL. */
    @Test
    void searchAdminProductsReturnsActiveProductsWhenSearchIsNull() {
        Category category = categoryRepository.save(new Category("Repo Alimentos", null));
        Product product = product("Granola repo", "779999000001", category, ProductOnlineStatus.PUBLISHED);
        productRepository.saveAndFlush(product);

        var result = productRepository.searchAdminProducts(null, null, null, PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .contains("Granola repo");
    }

    /** Verifies name/barcode search and status filtering can be combined. */
    @Test
    void searchAdminProductsFiltersBySearchAndStatus() {
        Category category = categoryRepository.save(new Category("Repo Suplementos", null));
        productRepository.save(product("Proteina repo", "779999000002", category, ProductOnlineStatus.DRAFT));
        productRepository.save(product("Yerba repo", "779999000003", category, ProductOnlineStatus.PUBLISHED));
        productRepository.flush();

        var result = productRepository.searchAdminProducts("779999000002", null, ProductOnlineStatus.DRAFT, PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .containsExactly("Proteina repo");
    }

    /** Creates a product entity for repository tests. */
    private Product product(String name, String barcode, Category category, ProductOnlineStatus status) {
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(BigDecimal.valueOf(1000));
        product.setMinimumStock(1);
        product.setOnlineStatus(status);
        return product;
    }
}
