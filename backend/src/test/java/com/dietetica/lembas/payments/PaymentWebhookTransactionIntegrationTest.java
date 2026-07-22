package com.dietetica.lembas.payments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.payments.service.GatewayPaymentLookup;
import com.dietetica.lembas.payments.service.MercadoPagoWebhookProcessor;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * PostgreSQL-backed characterization tests for signed approved Mercado Pago webhooks.
 *
 * <p>The {@link PaymentGateway} is replaced at the module boundary, ensuring the
 * tests exercise no real Mercado Pago client while the controller signature check,
 * application transactions, FEFO deduction, and durable database state remain real.</p>
 */
@AutoConfigureMockMvc
class PaymentWebhookTransactionIntegrationTest extends AbstractIntegrationTest {

    private static final String WEBHOOK_SECRET = "dev-fake-secret";
    private static final String PROVIDER_PAYMENT_ID = "987654321";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private MercadoPagoWebhookProcessor webhookProcessor;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @MockitoBean
    private PaymentGateway paymentGateway;

    private Branch branch;
    private Product product;
    private Order order;
    private Payment payment;
    private StockLot earliestLot;
    private StockLot laterLot;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(status -> {
            stockMovementRepository.deleteAllInBatch();
            paymentRepository.deleteAllInBatch();
            orderRepository.deleteAllInBatch();
            stockLotRepository.deleteAllInBatch();
            entityManager
                    .createNativeQuery("DELETE FROM supplier_product_cost_history")
                    .executeUpdate();
            entityManager.createNativeQuery("DELETE FROM supplier_products").executeUpdate();
            productRepository.deleteAllInBatch();
            categoryRepository.deleteAllInBatch();
            userRepository.deleteAllInBatch();
        });
        entityManager.clear();

        branch = defaultBranch();
        product = productRepository.saveAndFlush(product());
        order = orderRepository.saveAndFlush(pendingOrder(product));
        payment = paymentRepository.saveAndFlush(pendingPayment(order));
        earliestLot = stockLotRepository.saveAndFlush(stockLot(product, "2.000", LocalDate.of(2026, 1, 1)));
        laterLot = stockLotRepository.saveAndFlush(stockLot(product, "3.000", LocalDate.of(2026, 2, 1)));

        when(paymentGateway.findPayment(PROVIDER_PAYMENT_ID))
                .thenReturn(Optional.of(new GatewayPaymentLookup(
                        PROVIDER_PAYMENT_ID,
                        "approved",
                        new BigDecimal("40.00"),
                        "ARS",
                        Map.of("external_reference", order.getOrderNumber()))));
    }

    @Test
    void approvedSignedWebhookCommitsPaymentOrderAndExactFefoDeduction() throws Exception {
        notifyApprovedPayment();

        Payment persistedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        Order persistedOrder = orderRepository.findById(order.getId()).orElseThrow();
        StockLot persistedEarliestLot =
                stockLotRepository.findById(earliestLot.getId()).orElseThrow();
        StockLot persistedLaterLot =
                stockLotRepository.findById(laterLot.getId()).orElseThrow();
        List<StockMovement> movements = stockMovementRepository.findSaleMovementsByOrderId(order.getId());

        assertThat(persistedPayment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(persistedPayment.getApprovedAt()).isNotNull();
        assertThat(persistedOrder.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(persistedOrder.getPaidAt()).isNotNull();
        assertThat(persistedEarliestLot.getQuantityAvailable()).isEqualByComparingTo("0.000");
        assertThat(persistedEarliestLot.getStatus()).isEqualTo(StockLotStatus.DEPLETED);
        assertThat(persistedLaterLot.getQuantityAvailable()).isEqualByComparingTo("1.000");
        assertThat(persistedLaterLot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
        assertThat(movements)
                .extracting(StockMovement::getType)
                .containsExactly(StockMovementType.ONLINE_SALE, StockMovementType.ONLINE_SALE);
        assertThat(movements)
                .extracting(movement -> movement.getStockLot().getId())
                .containsExactly(earliestLot.getId(), laterLot.getId());
        assertThat(movements)
                .extracting(StockMovement::getQuantity)
                .containsExactly(new BigDecimal("-2.000"), new BigDecimal("-2.000"));
        verify(paymentGateway).findPayment(PROVIDER_PAYMENT_ID);
    }

    @Test
    void sequentialDuplicateApprovedWebhooksLeaveOneDurableDeduction() throws Exception {
        notifyApprovedPayment();
        notifyApprovedPayment();

        assertSingleApprovedDeduction();
        verify(paymentGateway, times(2)).findPayment(PROVIDER_PAYMENT_ID);
    }

    @Test
    void concurrentDuplicateApprovedWebhooksSerializeToOneDeduction() throws Exception {
        CyclicBarrier providerLookupsReady = new CyclicBarrier(2);
        when(paymentGateway.findPayment(PROVIDER_PAYMENT_ID)).thenAnswer(invocation -> {
            await(providerLookupsReady);
            return approvedProviderState();
        });
        CountDownLatch workersReady = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<Optional<Long>> first = executor.submit(() -> processInTransaction(workersReady, start));
            Future<Optional<Long>> second = executor.submit(() -> processInTransaction(workersReady, start));
            assertThat(workersReady.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            assertThat(first.get(10, TimeUnit.SECONDS)).contains(payment.getId());
            assertThat(second.get(10, TimeUnit.SECONDS)).contains(payment.getId());
        } finally {
            start.countDown();
            shutDown(executor);
        }

        assertSingleApprovedDeduction();
        verify(paymentGateway, times(2)).findPayment(PROVIDER_PAYMENT_ID);
    }

    @Test
    void unexpectedStockDomainFailureRollsBackPaymentAndOrder() {
        transactionTemplate.executeWithoutResult(status -> {
            Product persistedProduct =
                    productRepository.findById(product.getId()).orElseThrow();
            persistedProduct.setActive(false);
            productRepository.saveAndFlush(persistedProduct);
        });

        assertThatThrownBy(() -> transactionTemplate.execute(status -> webhookProcessor.process(webhookPayload())))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRODUCT_NOT_FOUND");

        assertThat(paymentRepository.findById(payment.getId()).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.PENDING);
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(stockMovementRepository.findSaleMovementsByOrderId(order.getId()))
                .isEmpty();
        assertThat(stockLotRepository
                        .findById(earliestLot.getId())
                        .orElseThrow()
                        .getQuantityAvailable())
                .isEqualByComparingTo("2.000");
        assertThat(stockLotRepository.findById(laterLot.getId()).orElseThrow().getQuantityAvailable())
                .isEqualByComparingTo("3.000");
    }

    @Test
    void refundedWebhookRestoresExactOriginalLotsOnlyOnce() throws Exception {
        notifyApprovedPayment();
        when(paymentGateway.findPayment(PROVIDER_PAYMENT_ID))
                .thenReturn(Optional.of(new GatewayPaymentLookup(
                        PROVIDER_PAYMENT_ID,
                        "refunded",
                        new BigDecimal("40.00"),
                        "ARS",
                        Map.of("external_reference", order.getOrderNumber()))));

        notifyApprovedPayment();
        notifyApprovedPayment();

        assertThat(paymentRepository.findById(payment.getId()).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.REFUNDED);
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.CANCELLED);
        assertThat(stockLotRepository
                        .findById(earliestLot.getId())
                        .orElseThrow()
                        .getQuantityAvailable())
                .isEqualByComparingTo("2.000");
        assertThat(stockLotRepository.findById(laterLot.getId()).orElseThrow().getQuantityAvailable())
                .isEqualByComparingTo("3.000");
        assertThat(cancellationReturns())
                .extracting(StockMovement::getQuantity)
                .containsExactly(new BigDecimal("2.000"), new BigDecimal("2.000"));
    }

    private Optional<Long> processInTransaction(CountDownLatch workersReady, CountDownLatch start) {
        workersReady.countDown();
        await(start);
        return transactionTemplate.execute(status -> webhookProcessor.process(webhookPayload()));
    }

    private void assertSingleApprovedDeduction() {
        assertThat(paymentRepository.findById(payment.getId()).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.APPROVED);
        assertThat(orderRepository.findById(order.getId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PAID);
        assertThat(stockLotRepository
                        .findById(earliestLot.getId())
                        .orElseThrow()
                        .getQuantityAvailable())
                .isEqualByComparingTo("0.000");
        assertThat(stockLotRepository.findById(laterLot.getId()).orElseThrow().getQuantityAvailable())
                .isEqualByComparingTo("1.000");
        assertThat(stockMovementRepository.findSaleMovementsByOrderId(order.getId()))
                .extracting(StockMovement::getQuantity)
                .containsExactly(new BigDecimal("-2.000"), new BigDecimal("-2.000"));
    }

    private List<StockMovement> cancellationReturns() {
        return stockMovementRepository.findAll().stream()
                .filter(movement -> movement.getType() == StockMovementType.CANCELLATION_RETURN)
                .sorted(java.util.Comparator.comparing(StockMovement::getId))
                .toList();
    }

    private Optional<GatewayPaymentLookup> approvedProviderState() {
        return Optional.of(new GatewayPaymentLookup(
                PROVIDER_PAYMENT_ID,
                "approved",
                new BigDecimal("40.00"),
                "ARS",
                Map.of("external_reference", order.getOrderNumber())));
    }

    private static MercadoPagoWebhookPayload webhookPayload() {
        return new MercadoPagoWebhookPayload(
                "payment",
                "payment.updated",
                null,
                new MercadoPagoWebhookPayload.Data(PROVIDER_PAYMENT_ID),
                false,
                null);
    }

    private void notifyApprovedPayment() throws Exception {
        String timestamp = "1700000000";
        String requestId = "webhook-test-request";
        String signature = "ts=" + timestamp + ",v1="
                + hmac(
                        WEBHOOK_SECRET,
                        "id:" + PROVIDER_PAYMENT_ID + ";request-id:" + requestId + ";ts:" + timestamp + ";");

        mockMvc.perform(post("/api/webhooks/mercadopago?data.id=" + PROVIDER_PAYMENT_ID)
                        .header("x-signature", signature)
                        .header("x-request-id", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "type": "payment",
                                  "action": "payment.updated",
                                  "data": {"id": "%s"}
                                }
                                """
                                        .formatted(PROVIDER_PAYMENT_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
    }

    private Product product() {
        Category category = categoryRepository.saveAndFlush(new Category("Webhook category", null));
        Product value = new Product();
        value.setCategory(category);
        value.setName("Webhook product");
        value.setBarcode("7790000000001");
        value.setSalePrice(new BigDecimal("10.00"));
        value.setMinimumStock(1);
        value.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        return value;
    }

    private Order pendingOrder(Product orderProduct) {
        User customer = userRepository.saveAndFlush(
                new User(null, "webhook-customer@lembas.test", "hash", "Webhook", "Customer", null, Role.CUSTOMER));
        Order value = new Order();
        value.setOrderNumber("ON-WEBHOOK-001");
        value.setType(OrderType.ONLINE);
        value.setStatus(OrderStatus.PENDING_PAYMENT);
        value.setFulfillmentType(FulfillmentType.PICKUP);
        value.setBranch(branch);
        value.setCustomerUser(customer);
        value.setSubtotal(new BigDecimal("40.00"));
        value.setDiscountTotal(BigDecimal.ZERO);
        value.setTotal(new BigDecimal("40.00"));
        OrderItem item = new OrderItem();
        item.setProduct(orderProduct);
        item.setQuantity(new BigDecimal("4.000"));
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(new BigDecimal("40.00"));
        item.setProductNameSnapshot(orderProduct.getName());
        item.setProductBarcodeSnapshot(orderProduct.getBarcode());
        item.setCostPriceSnapshot(new BigDecimal("5.00"));
        value.addItem(item);
        return value;
    }

    private Payment pendingPayment(Order paymentOrder) {
        Payment value = new Payment();
        value.setOrder(paymentOrder);
        value.setProvider(PaymentProvider.MERCADO_PAGO);
        value.setMethod(PaymentMethod.CHECKOUT_PRO);
        value.setStatus(PaymentStatus.PENDING);
        value.setAmount(new BigDecimal("40.00"));
        value.setProviderPaymentId(PROVIDER_PAYMENT_ID);
        value.setExternalReference(paymentOrder.getOrderNumber());
        return value;
    }

    private StockLot stockLot(Product lotProduct, String quantity, LocalDate expirationDate) {
        StockLot value = new StockLot();
        value.setProduct(lotProduct);
        value.setBranch(branch);
        value.setInitialQuantity(new BigDecimal(quantity));
        value.setQuantityAvailable(new BigDecimal(quantity));
        value.setUnitCost(new BigDecimal("5.00"));
        value.setCostPrice(new BigDecimal("5.00"));
        value.setLotCode("LOT-" + expirationDate);
        value.setExpirationDate(expirationDate);
        value.setStatus(StockLotStatus.ACTIVE);
        return value;
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for webhook workers");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while coordinating webhook workers", exception);
        }
    }

    private static void await(CyclicBarrier barrier) {
        try {
            barrier.await(5, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new AssertionError("Webhook workers did not reach provider lookup together", exception);
        }
    }

    private static void shutDown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
            throw new AssertionError("Timed out terminating webhook executor");
        }
    }

    /** Returns the Flyway-seeded branch required by the application integration fixture. */
    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for webhook tests"));
    }

    private static String hmac(String secret, String manifest) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot sign webhook fixture", exception);
        }
    }
}
