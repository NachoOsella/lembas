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

        var result = productRepository.searchAdminProducts(null, category.getId(), null, PageRequest.of(0, 10));

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

    // ---------------------------------------------------------------------------
    // Store queries
    // ---------------------------------------------------------------------------

    @Test
    void searchStoreProductsShouldReturnOnlyPublishedProducts() {
        Category category = categoryRepository.save(new Category("Repo Store", null));
        productRepository.save(product("Published item", "779999000010", category, ProductOnlineStatus.PUBLISHED));
        productRepository.save(product("Draft item", "779999000011", category, ProductOnlineStatus.DRAFT));
        productRepository.save(product("Paused item", "779999000012", category, ProductOnlineStatus.PAUSED));
        productRepository.flush();

        var result = productRepository.searchStoreProducts(null, category.getId(), PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .containsExactly("Published item");

        assertThat(result.getContent())
                .extracting(Product::getName)
                .doesNotContain("Draft item", "Paused item");
    }

    @Test
    void searchStoreProductsShouldFilterByCategory() {
        Category cat1 = categoryRepository.save(new Category("Repo Store Cats", null));
        Category cat2 = categoryRepository.save(new Category("Repo Store Other", null));
        productRepository.save(product("Cat1 product", "779999000020", cat1, ProductOnlineStatus.PUBLISHED));
        productRepository.save(product("Cat2 product", "779999000021", cat2, ProductOnlineStatus.PUBLISHED));
        productRepository.flush();

        var result = productRepository.searchStoreProducts(null, cat1.getId(), PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .containsExactly("Cat1 product");
    }

    @Test
    void searchStoreProductsShouldNotReturnInactiveProducts() {
        Category category = categoryRepository.save(new Category("Repo Store Inactive", null));
        Product inactive = product("Inactive product", "779999000030", category, ProductOnlineStatus.PUBLISHED);
        inactive.setActive(false);
        productRepository.save(inactive);
        productRepository.flush();

        var result = productRepository.searchStoreProducts(null, null, PageRequest.of(0, 100));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .doesNotContain("Inactive product");
    }

    @Test
    void searchStoreProductsShouldFilterBySearch() {
        Category category = categoryRepository.save(new Category("Repo Store Search", null));
        productRepository.save(product("Granola integral", "779999000040", category, ProductOnlineStatus.PUBLISHED));
        productRepository.save(product("Yerba premium", "779999000041", category, ProductOnlineStatus.PUBLISHED));
        productRepository.flush();

        var result = productRepository.searchStoreProducts("granola integral", null, PageRequest.of(0, 100));

        assertThat(result.getContent())
                .extracting(Product::getName)
                .contains("Granola integral");

        assertThat(result.getContent())
                .extracting(Product::getName)
                .doesNotContain("Yerba premium");
    }

    @Test
    void searchStoreProductsShouldMatchBarcodeAndCategoryName() {
        Category category = categoryRepository.save(new Category("Repo Cereales", null));
        productRepository.save(product("Avena fina", "779999000060", category, ProductOnlineStatus.PUBLISHED));
        productRepository.flush();

        var barcodeResult = productRepository.searchStoreProducts("779999000060", null, PageRequest.of(0, 100));
        var categoryResult = productRepository.searchStoreProducts("cereales", null, PageRequest.of(0, 100));

        assertThat(barcodeResult.getContent())
                .extracting(Product::getName)
                .contains("Avena fina");
        assertThat(categoryResult.getContent())
                .extracting(Product::getName)
                .contains("Avena fina");
    }

    @Test
    void findByIdAndActiveTrueAndOnlineStatusShouldReturnPublishedProduct() {
        Category category = categoryRepository.save(new Category("Repo Store Detail", null));
        Product product = product("Published detail", "779999000050", category, ProductOnlineStatus.PUBLISHED);
        productRepository.save(product);
        productRepository.flush();

        var result = productRepository.findByIdAndActiveTrueAndOnlineStatus(product.getId(), ProductOnlineStatus.PUBLISHED);

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Published detail");
    }

    @Test
    void findByIdAndActiveTrueAndOnlineStatusShouldReturnEmptyForDraft() {
        Category category = categoryRepository.save(new Category("Repo Store Detail Draft", null));
        Product product = product("Draft detail", "779999000051", category, ProductOnlineStatus.DRAFT);
        productRepository.save(product);
        productRepository.flush();

        var result = productRepository.findByIdAndActiveTrueAndOnlineStatus(product.getId(), ProductOnlineStatus.PUBLISHED);

        assertThat(result).isEmpty();
    }

    // ---------------------------------------------------------------------------
    // Related products queries
    // ---------------------------------------------------------------------------

    @Test
    void findRandomRelatedProductsShouldReturnSameCategoryExcludingCurrent() {
        Category cat1 = categoryRepository.save(new Category("Repo Related Cats", null));
        Category cat2 = categoryRepository.save(new Category("Repo Related Other", null));

        Product current = product("Current product", "779999000070", cat1, ProductOnlineStatus.PUBLISHED);
        productRepository.save(current);

        Product related1 = product("Related A", "779999000071", cat1, ProductOnlineStatus.PUBLISHED);
        Product related2 = product("Related B", "779999000072", cat1, ProductOnlineStatus.PUBLISHED);
        productRepository.save(related1);
        productRepository.save(related2);

        Product otherCategory = product("Other cat product", "779999000073", cat2, ProductOnlineStatus.PUBLISHED);
        productRepository.save(otherCategory);

        Product draft = product("Draft in same cat", "779999000074", cat1, ProductOnlineStatus.DRAFT);
        productRepository.save(draft);

        productRepository.flush();

        var result = productRepository.findRandomRelatedProducts(
                cat1.getId(), current.getId(), PageRequest.of(0, 10));

        assertThat(result)
                .extracting(Product::getName)
                .containsExactlyInAnyOrder("Related A", "Related B");

        assertThat(result)
                .extracting(Product::getName)
                .doesNotContain("Current product", "Other cat product", "Draft in same cat");
    }

    @Test
    void findRandomRelatedProductsShouldReturnEmptyWhenNoOtherProductsInCategory() {
        Category category = categoryRepository.save(new Category("Repo Related Empty", null));
        Product only = product("Only product", "779999000080", category, ProductOnlineStatus.PUBLISHED);
        productRepository.save(only);
        productRepository.flush();

        var result = productRepository.findRandomRelatedProducts(
                category.getId(), only.getId(), PageRequest.of(0, 6));

        assertThat(result).isEmpty();
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
