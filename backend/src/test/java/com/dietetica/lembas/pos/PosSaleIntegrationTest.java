package com.dietetica.lembas.pos;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for {@code POST /api/pos/sales}.
 *
 * <p>Exercises the full Spring stack (JWT filter, controller, service, JPA,
 * Flyway schema) against a real PostgreSQL container, with deterministic
 * per-test fixtures.</p>
 */
@AutoConfigureMockMvc
class PosSaleIntegrationTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserRepository userRepository;
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactionTemplate;
    @Autowired private jakarta.persistence.EntityManager entityManager;
    @Autowired private BranchRepository branchRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockLotRepository stockLotRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private CashSessionRepository cashSessionRepository;
    @Autowired private CashService cashService;

    private Branch branch;
    private Product product;
    private User cashier;
    private String cashierToken;

    @BeforeEach
    void seedFixtures() {
        // Order matters because of FKs and partial-unique indexes.
        // Run the cleanup in a single transaction so native deletes are valid.
        transactionTemplate.executeWithoutResult(status -> {
            stockMovementRepository.deleteAllInBatch();
            paymentRepository.deleteAllInBatch();
            orderRepository.deleteAllInBatch();
            cashSessionRepository.deleteAllInBatch();
            stockLotRepository.deleteAllInBatch();
            // supplier_products / supplier_product_cost_history may exist from seeds
            entityManager.createNativeQuery("DELETE FROM supplier_product_cost_history").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM supplier_products").executeUpdate();
            productRepository.deleteAllInBatch();
            categoryRepository.deleteAllInBatch();
            // users depend on branches; clear them first
            userRepository.deleteAllInBatch();
            branchRepository.deleteAllInBatch();
        });
        entityManager.clear();

        branch = branchRepository.saveAndFlush(activeBranch("POS Branch"));

        User admin = userRepository.saveAndFlush(new User(
                null, "admin@it.com", passwordEncoder.encode("AdminPass!123"),
                "Admin", "User", null, Role.ADMIN));
        cashier = userRepository.saveAndFlush(new User(
                branch.getId(), "cashier@it.com", passwordEncoder.encode("CashPass!123"),
                "Carla", "Cajero", null, Role.EMPLOYEE));
        cashierToken = jwtTokenProvider.createAccessToken(cashier);

        Category category = newCategory("Integration");
        category = categoryRepository.saveAndFlush(category);

        product = new Product();
        product.setName("Aceite de Oliva 500ml");
        product.setCategory(category);
        product.setBarcode("7501234567890");
        product.setSalePrice(new BigDecimal("2500.00"));
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        product.setActive(true);
        product = productRepository.saveAndFlush(product);
    }

    // ---------------------------------------------------------------------------
    // Happy path
    // ---------------------------------------------------------------------------

    @Test
    void createSale_cashPayment_persistsOrderPaymentAndDeductsStockFefo() throws Exception {
        openCashSession();
        StockLot lot = persistLot(product, new BigDecimal("10"), null);
        BigDecimal totalStockBefore = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());

        CreatePosSaleRequest request = saleRequest(product.getId(), 3, PaymentMethod.CASH, null);
        String body = objectMapper.writeValueAsString(request);

        MvcResult result = mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("POS"))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.total").value(7500.00))
                .andExpect(jsonPath("$.items[0].productId").value(product.getId()))
                .andExpect(jsonPath("$.items[0].productName").value("Aceite de Oliva 500ml"))
                .andExpect(jsonPath("$.items[0].quantity").value(3))
                .andExpect(jsonPath("$.payments[0].provider").value("MANUAL"))
                .andExpect(jsonPath("$.payments[0].method").value("CASH"))
                .andExpect(jsonPath("$.payments[0].status").value("APPROVED"))
                .andReturn();

        // Stock decreased by 3
        BigDecimal stockAfter = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());
        assertThat(stockAfter).isEqualByComparingTo(totalStockBefore.subtract(BigDecimal.valueOf(3)));

        // StockMovement POS_SALE persisted
        var movements = stockMovementRepository.findByStockLotId(lot.getId());
        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getType()).isEqualTo(StockMovementType.POS_SALE);
        assertThat(movements.get(0).getQuantity()).isEqualByComparingTo("-3");
        assertThat(movements.get(0).getOrderId()).isNotNull();
        assertThat(movements.get(0).getUnitCostSnapshot()).isNotNull();

        // Order has the cash session id set
        Long orderId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        var savedOrder = orderRepository.findById(orderId).orElseThrow();
        assertThat(savedOrder.getType()).isEqualTo(OrderType.POS);
        assertThat(savedOrder.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(savedOrder.getCashSessionId()).isNotNull();
    }

    @Test
    void createSale_qrPayment_persistsPaymentWithCorrectMethod() throws Exception {
        openCashSession();
        persistLot(product, new BigDecimal("5"), null);

        CreatePosSaleRequest request = saleRequest(product.getId(), 1, PaymentMethod.QR, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payments[0].method").value("QR"));

        var payments = paymentRepository.findByOrderIdOrderByIdAsc(orderRepository.findAll().get(0).getId());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getMethod()).isEqualTo(PaymentMethod.QR);
        assertThat(payments.get(0).getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(payments.get(0).getProvider()).isEqualTo(PaymentProvider.MANUAL);
    }

    @Test
    void createSale_persistsCashReceivedInPaymentMetadata() throws Exception {
        openCashSession();
        persistLot(product, new BigDecimal("5"), null);

        CreatePosSaleRequest request = new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(product.getId(), 1)),
                PaymentMethod.CASH, new BigDecimal("3000.00"), null, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        var payment = paymentRepository.findByOrderIdOrderByIdAsc(orderRepository.findAll().get(0).getId()).get(0);
        assertThat(payment.getMetadata()).contains("\"cashReceived\"").contains("3000.00");
    }

    // ---------------------------------------------------------------------------
    // Stock behavior
    // ---------------------------------------------------------------------------

    @Test
    void createSale_usesFefoOrderAcrossLots() throws Exception {
        openCashSession();
        // FEFO: expirationDate ASC nulls last. Lot B has earlier expiration, should
        // be deducted first.
        StockLot earlier = persistLot(product, new BigDecimal("2"), LocalDate.now().plusDays(5));
        StockLot later = persistLot(product, new BigDecimal("5"), LocalDate.now().plusDays(30));
        earlier = stockLotRepository.findById(earlier.getId()).orElseThrow();
        later = stockLotRepository.findById(later.getId()).orElseThrow();

        CreatePosSaleRequest request = saleRequest(product.getId(), 4, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        StockLot earlierAfter = stockLotRepository.findById(earlier.getId()).orElseThrow();
        StockLot laterAfter = stockLotRepository.findById(later.getId()).orElseThrow();
        assertThat(earlierAfter.getQuantityAvailable()).isEqualByComparingTo("0");
        assertThat(laterAfter.getQuantityAvailable()).isEqualByComparingTo("3");
    }

    @Test
    void createSale_createsOneStockMovementPerLotDeducted() throws Exception {
        openCashSession();
        persistLot(product, new BigDecimal("2"), LocalDate.now().plusDays(5));
        persistLot(product, new BigDecimal("3"), LocalDate.now().plusDays(30));

        CreatePosSaleRequest request = saleRequest(product.getId(), 4, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        var movements = stockMovementRepository.findAll();
        assertThat(movements).hasSize(2);
        assertThat(movements).allMatch(m -> m.getType() == StockMovementType.POS_SALE);
    }

    @Test
    void createSale_insufficientStock_returns409_andNoPartialDeduction() throws Exception {
        openCashSession();
        StockLot lot = persistLot(product, new BigDecimal("2"), null);
        BigDecimal stockBefore = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());

        CreatePosSaleRequest request = saleRequest(product.getId(), 5, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

        // No partial deduction
        BigDecimal stockAfter = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());
        assertThat(stockAfter).isEqualByComparingTo(stockBefore);
        assertThat(stockMovementRepository.findByStockLotId(lot.getId())).isEmpty();
        assertThat(orderRepository.count()).isZero();
    }

    // ---------------------------------------------------------------------------
    // Validation errors
    // ---------------------------------------------------------------------------

    @Test
    void createSale_withoutOpenCashSession_returns404() throws Exception {
        // No cash session opened
        persistLot(product, new BigDecimal("5"), null);

        CreatePosSaleRequest request = saleRequest(product.getId(), 1, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CASH_SESSION_NOT_FOUND"));
    }

    @Test
    void createSale_inactiveProduct_returns404() throws Exception {
        openCashSession();
        persistLot(product, new BigDecimal("5"), null);
        product.setActive(false);
        productRepository.saveAndFlush(product);

        CreatePosSaleRequest request = saleRequest(product.getId(), 1, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    @Test
    void createSale_emptyItems_returns400() throws Exception {
        openCashSession();
        String body = """
                { "items": [], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createSale_invalidQuantity_returns400() throws Exception {
        openCashSession();
        String body = """
                { "items": [ { "productId": 1, "quantity": 0 } ], "paymentMethod": "CASH" }
                """;

        mockMvc.perform(post("/api/pos/sales")
                        .header("Authorization", "Bearer " + cashierToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createSale_unauthenticated_returns401() throws Exception {
        persistLot(product, new BigDecimal("5"), null);
        openCashSession();
        String body = objectMapper.writeValueAsString(
                saleRequest(product.getId(), 1, PaymentMethod.CASH, null));

        mockMvc.perform(post("/api/pos/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private void openCashSession() {
        CashSessionDto session = cashService.openCashSession(
                new com.dietetica.lembas.cash.dto.OpenCashSessionRequest(
                        new BigDecimal("100.00"), null, null),
                cashier);
        assertThat(session.status()).isEqualTo(CashSessionStatus.OPEN);
    }

    private StockLot persistLot(Product product, BigDecimal available, LocalDate expiration) {
        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(available);
        lot.setQuantityAvailable(available);
        lot.setUnitCost(new BigDecimal("1000.00"));
        lot.setCostPrice(new BigDecimal("1000.00"));
        lot.setLotCode("L-" + System.nanoTime());
        lot.setStatus(StockLotStatus.ACTIVE);
        lot.setExpirationDate(expiration);
        return stockLotRepository.saveAndFlush(lot);
    }

    private static Branch activeBranch(String name) {
        // Branch has protected no-args constructor and no setters; use reflection.
        try {
            var ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch b = ctor.newInstance();
            ReflectionTestUtils.setField(b, "name", name);
            ReflectionTestUtils.setField(b, "address", "Test street 123");
            ReflectionTestUtils.setField(b, "phone", "+54 351 000 000");
            ReflectionTestUtils.setField(b, "active", true);
            return b;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to build Branch fixture", e);
        }
    }

    private static Category newCategory(String name) {
        // Category has protected no-args constructor; use reflection.
        try {
            var ctor = Category.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Category c = ctor.newInstance();
            ReflectionTestUtils.setField(c, "name", name);
            return c;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to build Category fixture", e);
        }
    }

    private static CreatePosSaleRequest saleRequest(
            Long productId, int qty, PaymentMethod method, BigDecimal cashReceived) {
        return new CreatePosSaleRequest(
                List.of(new CreatePosSaleItemRequest(productId, qty)),
                method, cashReceived, null, null);
    }
}
