package com.dietetica.lembas.inventory.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** PostgreSQL-backed tests for stock lot availability and FEFO queries. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StockLotRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"));

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void calculateAvailableQuantityShouldSumLotsForProductAndBranch() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Stock sum product", "779991000001"));
        stockLotRepository.save(
                lot(product, branch, "A", "1.500", LocalDate.now().plusDays(10)));
        stockLotRepository.save(
                lot(product, branch, "B", "2.250", LocalDate.now().plusDays(20)));
        stockLotRepository.save(
                lot(product, branch, "ZERO", "0.000", LocalDate.now().plusDays(1)));
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
        stockLotRepository.save(
                lot(product, branch, "LATER", "1.000", LocalDate.now().plusDays(30)));
        stockLotRepository.save(
                lot(product, branch, "EARLY", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.save(
                lot(product, branch, "EMPTY", "0.000", LocalDate.now().plusDays(1)));
        stockLotRepository.flush();

        var lots = stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId());

        assertThat(lots).extracting(StockLot::getLotCode).containsExactly("EARLY", "LATER", "NO_DATE");
    }

    @Test
    void findAvailableLotsForUpdateShouldOrderEqualExpirationDatesByLotIdentity() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("FEFO tie-breaker product", "779991000006"));
        LocalDate expirationDate = LocalDate.now().plusDays(10);
        StockLot firstSaved = stockLotRepository.saveAndFlush(lot(product, branch, "FIRST", "1.000", expirationDate));
        StockLot secondSaved = stockLotRepository.saveAndFlush(lot(product, branch, "SECOND", "1.000", expirationDate));

        var lots = stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId());

        assertThat(lots).extracting(StockLot::getId).containsExactly(firstSaved.getId(), secondSaved.getId());
    }

    /**
     * PostgreSQL characterization: a competing PESSIMISTIC_WRITE query must
     * wait until the transaction that owns the lot lock completes.
     */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void findByIdForUpdateBlocksACompetingWriterUntilTheFirstTransactionCompletes() throws Exception {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Locking product", "779991000007"));
        StockLot lot = stockLotRepository.saveAndFlush(lot(product, branch, "LOCKED", "1.000", null));
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transactionTemplate.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        CountDownLatch firstLockAcquired = new CountDownLatch(1);
        CountDownLatch releaseFirstTransaction = new CountDownLatch(1);
        CountDownLatch secondLockAttemptStarted = new CountDownLatch(1);
        CountDownLatch secondLockAcquired = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<?> firstTransaction = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                stockLotRepository.findByIdForUpdate(lot.getId()).orElseThrow();
                firstLockAcquired.countDown();
                await(releaseFirstTransaction);
            }));
            assertThat(firstLockAcquired.await(5, TimeUnit.SECONDS)).isTrue();

            Future<?> secondTransaction = executor.submit(() -> transactionTemplate.executeWithoutResult(status -> {
                secondLockAttemptStarted.countDown();
                stockLotRepository.findByIdForUpdate(lot.getId()).orElseThrow();
                secondLockAcquired.countDown();
            }));
            assertThat(secondLockAttemptStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThat(secondLockAcquired.await(300, TimeUnit.MILLISECONDS)).isFalse();

            releaseFirstTransaction.countDown();
            firstTransaction.get(5, TimeUnit.SECONDS);
            secondTransaction.get(5, TimeUnit.SECONDS);
            assertThat(secondLockAcquired.getCount()).isZero();
        } finally {
            releaseFirstTransaction.countDown();
            shutDown(executor);
            deleteLockingFixtures(lot, product);
        }
    }

    @Test
    void searchLotsShouldFilterByProductBranchAndExpiringSoon() {
        Branch branch = defaultBranch();
        Product product = productRepository.save(product("Expiring product", "779991000004"));
        Product otherProduct = productRepository.save(product("Other product", "779991000005"));
        stockLotRepository.save(
                lot(product, branch, "SOON", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.save(
                lot(product, branch, "LATER", "1.000", LocalDate.now().plusDays(60)));
        stockLotRepository.save(
                lot(otherProduct, branch, "OTHER", "1.000", LocalDate.now().plusDays(5)));
        stockLotRepository.flush();

        var result = stockLotRepository.searchLots(
                null, product.getId(), branch.getId(), true, LocalDate.now().plusDays(30), PageRequest.of(0, 10));

        assertThat(result.getContent()).extracting(StockLot::getLotCode).containsExactly("SOON");
    }

    /** Awaits a transaction coordination signal without using timing sleeps. */
    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for transaction coordination");
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while coordinating transactions", ex);
        }
    }

    /** Terminates concurrent test work after releasing any database lock it may await. */
    private void shutDown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
            throw new AssertionError("Timed out terminating lock test executor");
        }
    }

    /** Removes data committed outside the test-managed transaction by the lock characterization. */
    private void deleteLockingFixtures(StockLot lot, Product product) {
        stockLotRepository.deleteById(lot.getId());
        productRepository.deleteById(product.getId());
        categoryRepository.deleteById(product.getCategory().getId());
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
