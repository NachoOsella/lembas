package com.dietetica.lembas;

import com.dietetica.lembas.auth.repository.RefreshTokenRepository;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.repository.OrderItemRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptItemRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductCostHistoryRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import com.dietetica.lembas.suppliers.repository.PriceUpdateBatchRepository;
import com.dietetica.lembas.suppliers.repository.PriceUpdateBatchItemRepository;
import com.dietetica.lembas.catalog.repository.ProductSalePriceHistoryRepository;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Verifies that the application context can start without external services.
 */
@SpringBootTest(classes = LembasBackendApplication.class, properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
})
class LembasBackendApplicationTests {

    /**
     * Provides a repository collaborator while this smoke test intentionally avoids database startup.
     */
    @MockitoBean
    private UserRepository userRepository;

    /**
     * Provides a refresh token repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    /**
     * Provides a branch repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private BranchRepository branchRepository;

    /**
     * Provides a category repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private CategoryRepository categoryRepository;

    /**
     * Provides a product repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private ProductRepository productRepository;

    /** Provides inventory repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private StockLotRepository stockLotRepository;

    /** Provides inventory movement repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private StockMovementRepository stockMovementRepository;

    /** Provides the orders repository collaborator while JPA repositories are disabled. */
    @MockitoBean
    private OrderRepository orderRepository;

    /** Provides the order items repository collaborator while JPA repositories are disabled. */
    @MockitoBean
    private OrderItemRepository orderItemRepository;

    /** Provides the payments repository collaborator while JPA repositories are disabled. */
    @MockitoBean
    private PaymentRepository paymentRepository;

    /** Provides supplier repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private SupplierRepository supplierRepository;

    /** Provides supplier-product repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private SupplierProductRepository supplierProductRepository;

    /** Provides supplier cost history repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private SupplierProductCostHistoryRepository supplierProductCostHistoryRepository;

    /** Provides purchase order repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private PurchaseOrderRepository purchaseOrderRepository;

    /** Provides purchase receipt repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private PurchaseReceiptRepository purchaseReceiptRepository;

    /** Provides purchase receipt item repository collaborators while JPA repositories are disabled. */
    @MockitoBean
    private PurchaseReceiptItemRepository purchaseReceiptItemRepository;

    @MockitoBean
    private PriceUpdateBatchRepository priceUpdateBatchRepository;

    @MockitoBean
    private PriceUpdateBatchItemRepository priceUpdateBatchItemRepository;

    @MockitoBean
    private ProductSalePriceHistoryRepository productSalePriceHistoryRepository;

    /** Provides the cash session repository collaborator while JPA repositories are disabled. */
    @MockitoBean
    private CashSessionRepository cashSessionRepository;

    /** Provides the cash movement repository collaborator while JPA repositories are disabled. */
    @MockitoBean
    private CashMovementRepository cashMovementRepository;

    /**
     * Keeps a fast smoke test for the application context without external services.
     */
    @Test
    void contextLoads() {
    }
}
