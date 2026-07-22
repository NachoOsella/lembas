package com.dietetica.lembas.orders.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
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
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL concurrency tests for serialized, exact-once admin cancellation. */
class AdminOrderCancellationConcurrencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AdminOrderService adminOrderService;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    private Long orderId;
    private Long paymentId;
    private Long stockLotId;

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

        transactionTemplate.executeWithoutResult(status -> persistPaidOrderWithSaleMovement());
    }

    @Test
    void concurrentCancellationReReadsLockedStateAndReversesOnlyOnce() throws Exception {
        CountDownLatch firstOrderLockAcquired = new CountDownLatch(1);
        CountDownLatch runFirstCancellation = new CountDownLatch(1);
        CountDownLatch firstCancellationApplied = new CountDownLatch(1);
        CountDownLatch releaseFirstTransaction = new CountDownLatch(1);
        CountDownLatch secondAttemptStarted = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<String> first = executor.submit(() -> transactionTemplate.execute(status -> {
                orderRepository.findByIdForUpdate(orderId).orElseThrow();
                firstOrderLockAcquired.countDown();
                await(runFirstCancellation);
                adminOrderService.cancel(orderId, "First cancellation");
                firstCancellationApplied.countDown();
                await(releaseFirstTransaction);
                return "CANCELLED";
            }));
            assertThat(firstOrderLockAcquired.await(5, TimeUnit.SECONDS)).isTrue();

            Future<String> second = executor.submit(() -> {
                secondAttemptStarted.countDown();
                try {
                    adminOrderService.cancel(orderId, "Duplicate cancellation");
                    return "UNEXPECTED_SUCCESS";
                } catch (DomainException exception) {
                    return exception.getCode();
                }
            });
            assertThat(secondAttemptStarted.await(5, TimeUnit.SECONDS)).isTrue();

            runFirstCancellation.countDown();
            assertThat(firstCancellationApplied.await(5, TimeUnit.SECONDS)).isTrue();
            releaseFirstTransaction.countDown();

            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo("CANCELLED");
            assertThat(second.get(10, TimeUnit.SECONDS)).isEqualTo("ORDER_INVALID_STATE");
        } finally {
            runFirstCancellation.countDown();
            releaseFirstTransaction.countDown();
            shutDown(executor);
        }

        assertThat(orderRepository.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(paymentRepository.findById(paymentId).orElseThrow().getStatus())
                .isEqualTo(PaymentStatus.CANCELLED);
        assertThat(stockLotRepository.findById(stockLotId).orElseThrow().getQuantityAvailable())
                .isEqualByComparingTo("2.000");
        assertThat(cancellationReturns())
                .extracting(StockMovement::getQuantity)
                .containsExactly(new BigDecimal("2.000"));
    }

    private void persistPaidOrderWithSaleMovement() {
        Branch branch = branchRepository.findAll().stream().findFirst().orElseThrow();
        Category category = categoryRepository.save(new Category("Cancellation concurrency", null));
        Product product = new Product();
        product.setCategory(category);
        product.setName("Cancellation product");
        product.setBarcode("7790000000998");
        product.setSalePrice(new BigDecimal("20.00"));
        product.setMinimumStock(1);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        product = productRepository.save(product);
        User customer = userRepository.save(new User(
                null, "cancellation-concurrency@lembas.test", "hash", "Cancellation", "Customer", null, Role.CUSTOMER));

        Order order = new Order();
        order.setOrderNumber("ON-CANCEL-CONCURRENCY-001");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PAID);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("40.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("40.00"));
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(new BigDecimal("2.000"));
        item.setUnitPrice(new BigDecimal("20.00"));
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(new BigDecimal("40.00"));
        item.setProductNameSnapshot(product.getName());
        order.addItem(item);
        order = orderRepository.saveAndFlush(order);

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(new BigDecimal("40.00"));
        payment = paymentRepository.saveAndFlush(payment);

        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(new BigDecimal("2.000"));
        lot.setQuantityAvailable(BigDecimal.ZERO.setScale(3));
        lot.setUnitCost(new BigDecimal("10.00"));
        lot.setCostPrice(new BigDecimal("10.00"));
        lot.setLotCode("CANCEL-CONCURRENCY-LOT");
        lot.setStatus(StockLotStatus.DEPLETED);
        lot = stockLotRepository.saveAndFlush(lot);

        StockMovement sale = new StockMovement();
        sale.setStockLot(lot);
        sale.setProduct(product);
        sale.setBranch(branch);
        sale.setType(StockMovementType.ONLINE_SALE);
        sale.setQuantity(new BigDecimal("-2.000"));
        sale.setOrderId(order.getId());
        sale.setReferenceType("ORDER");
        sale.setReferenceId(order.getId());
        stockMovementRepository.saveAndFlush(sale);

        orderId = order.getId();
        paymentId = payment.getId();
        stockLotId = lot.getId();
    }

    private List<StockMovement> cancellationReturns() {
        return stockMovementRepository.findAll().stream()
                .filter(movement -> movement.getType() == StockMovementType.CANCELLATION_RETURN)
                .toList();
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out coordinating cancellation transactions");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while coordinating cancellation transactions", exception);
        }
    }

    private static void shutDown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
            throw new AssertionError("Timed out terminating cancellation executor");
        }
    }
}
