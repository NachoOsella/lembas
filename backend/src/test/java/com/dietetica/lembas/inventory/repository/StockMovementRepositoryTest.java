package com.dietetica.lembas.inventory.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** PostgreSQL-backed tests for stock movement searches. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StockMovementRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"));

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Test
    void findAllWithNullSpecificationShouldListMovementsOnPostgreSQL() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Movement search product", "779991000101"));
        StockLot lot = stockLotRepository.save(lot(product, branch));
        stockMovementRepository.save(movement(product, branch, lot));
        stockMovementRepository.flush();

        var page = stockMovementRepository.findAll((Specification<StockMovement>) null, PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(StockMovement::getType).contains(StockMovementType.PURCHASE_ENTRY);
    }

    /** Returns the demo branch inserted by Flyway seed data. */
    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for stock movement tests"));
    }

    /** Creates a persisted product for stock movement tests. */
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

    /** Creates a stock lot used as the movement target. */
    private StockLot lot(Product product, Branch branch) {
        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setLotCode("MOV-TEST");
        lot.setInitialQuantity(BigDecimal.ONE);
        lot.setQuantityAvailable(BigDecimal.ONE);
        lot.setCostPrice(BigDecimal.valueOf(500));
        lot.setUnitCost(BigDecimal.valueOf(500));
        return lot;
    }

    /** Creates an append-only purchase entry movement. */
    private StockMovement movement(Product product, Branch branch, StockLot lot) {
        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setStockLot(lot);
        movement.setType(StockMovementType.PURCHASE_ENTRY);
        movement.setQuantity(BigDecimal.ONE);
        movement.setReason("Repository search test");
        return movement;
    }
}
