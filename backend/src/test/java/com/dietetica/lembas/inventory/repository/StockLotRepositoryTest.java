package com.dietetica.lembas.inventory.repository;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
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
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** PostgreSQL-backed tests for stock lot availability and FEFO queries. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StockLotRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Test
    void calculateAvailableQuantityShouldSumLotsForProductAndBranch() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Stock sum product", "779991000001"));
        stockLotRepository.save(lot(product, branch, "A", "1.500", LocalDate.now().plusDays(10)));
        stockLotRepository.save(lot(product, branch, "B", "2.250", LocalDate.now().plusDays(20)));
        stockLotRepository.save(lot(product, branch, "ZERO", "0.000", LocalDate.now().plusDays(1)));
        stockLotRepository.flush();

        BigDecimal available = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());

        assertThat(available).isEqualByComparingTo("3.750");
    }

    @Test
    void calculateAvailableQuantityShouldReturnZeroWhenProductHasNoLotsInBranch() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("No stock product", "779991000002"));

        BigDecimal available = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());

        assertThat(available).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void findAvailableLotsForUpdateShouldUseFefoOrderWithNullExpirationLast() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("FEFO product", "779991000003"));
        stockLotRepository.save(lot(product, branch, "NO_DATE", "1.000", null));
        stockLotRepository.save(lot(product, branch, "LATER", "1.000", LocalDate.now().plusDays(30)));
        stockLotRepository.save(lot(product, branch, "EARLY", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.save(lot(product, branch, "EMPTY", "0.000", LocalDate.now().plusDays(1)));
        stockLotRepository.flush();

        var lots = stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId());

        assertThat(lots)
                .extracting(StockLot::getLotCode)
                .containsExactly("EARLY", "LATER", "NO_DATE");
    }

    @Test
    void searchLotsShouldFilterByProductBranchAndExpiringSoon() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Expiring product", "779991000004"));
        Product otherProduct = productRepository.save(product("Other product", "779991000005"));
        stockLotRepository.save(lot(product, branch, "SOON", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.save(lot(product, branch, "LATER", "1.000", LocalDate.now().plusDays(60)));
        stockLotRepository.save(lot(otherProduct, branch, "OTHER", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.flush();

        var result = stockLotRepository.searchLots(
                null, product.getId(), branch.getId(), true, LocalDate.now().plusDays(30), PageRequest.of(0, 10));

        assertThat(result.getContent())
                .extracting(StockLot::getLotCode)
                .containsExactly("SOON");
    }

    /** Returns the demo branch inserted by Flyway seed data. */
    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for stock tests"));
    }

    /** Creates a persisted product for inventory tests. */
    private Product product(String name, String barcode) {
        Category category = categoryRepository.save(new Category("Inventory " + name, null));
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(BigDecimal.valueOf(1000));
        product.setMinimumStock(1);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        return product;
    }

    /** Creates a stock lot with the requested available quantity. */
    private StockLot lot(Product product, Branch branch, String code, String quantity, LocalDate expirationDate) {
        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setLotCode(code);
        BigDecimal availableQuantity = new BigDecimal(quantity);
        lot.setInitialQuantity(availableQuantity.signum() == 0 ? BigDecimal.ONE : availableQuantity);
        lot.setQuantityAvailable(availableQuantity);
        lot.setExpirationDate(expirationDate);
        lot.setCostPrice(BigDecimal.valueOf(500));
        lot.setUnitCost(BigDecimal.valueOf(500));
        return lot;
    }
}
