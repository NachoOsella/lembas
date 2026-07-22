package com.dietetica.lembas.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.cash.dto.CashCloseRequest;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.cash.service.CashService;
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
import com.dietetica.lembas.orders.dto.CreateOnlineOrderItemRequest;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderRequest;
import com.dietetica.lembas.orders.dto.OrderCreatedDto;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.orders.service.CustomerOrderService;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.payments.service.CreatePreferenceCommand;
import com.dietetica.lembas.payments.service.GatewayPaymentLookup;
import com.dietetica.lembas.payments.service.PaymentPreferenceResult;
import com.dietetica.lembas.payments.service.PreferenceService;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.pos.service.PosSaleService;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL lifecycle coverage across cash, POS, orders, payments, and inventory boundaries. */
@AutoConfigureMockMvc
class CrossModulePurchaseLifecycleIntegrationTest extends AbstractIntegrationTest {

    private static final String WEBHOOK_SECRET = "dev-fake-secret";
    private static final String INIT_POINT = "https://payments.test/checkout";

    @Autowired
    private CashService cashService;

    @Autowired
    private PosSaleService posSaleService;

    @Autowired
    private CustomerOrderService customerOrderService;

    @Autowired
    private PreferenceService preferenceService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private CashMovementRepository cashMovementRepository;

    @Autowired
    private CashSessionRepository cashSessionRepository;

    @MockitoBean
    private PaymentGateway paymentGateway;

    private Branch branch;
    private Category category;
    private User employee;
    private User customer;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(status -> {
            stockMovementRepository.deleteAllInBatch();
            paymentRepository.deleteAllInBatch();
            orderRepository.deleteAllInBatch();
            cashMovementRepository.deleteAllInBatch();
            cashSessionRepository.deleteAllInBatch();
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

        branch = branchRepository.findAll().stream().findFirst().orElseThrow();
        category = categoryRepository.saveAndFlush(new Category("Lifecycle integration", null));
        employee = userRepository.saveAndFlush(new User(
                branch.getId(),
                "lifecycle-employee@lembas.test",
                "hash",
                "Lifecycle",
                "Employee",
                null,
                Role.EMPLOYEE));
        customer = userRepository.saveAndFlush(
                new User(null, "lifecycle-customer@lembas.test", "hash", "Lifecycle", "Customer", null, Role.CUSTOMER));
    }

    @Test
    void posLifecyclePersistsUnifiedSaleExactFefoMovementsAndPhysicalCashClose() {
        CashSessionDto opened = cashService.openCashSession(
                new OpenCashSessionRequest(new BigDecimal("100.00"), "Opening float", null), employee);
        Product product = persistProduct("POS lifecycle product", "7791000000001", "25.00");
        StockLot earliestLot = persistLot(product, "2.000", LocalDate.of(2030, 1, 1), "POS-EARLY");
        StockLot laterLot = persistLot(product, "3.000", LocalDate.of(2030, 2, 1), "POS-LATE");

        OrderDetailDto sale = posSaleService.createSale(
                new CreatePosSaleRequest(
                        List.of(new CreatePosSaleItemRequest(product.getId(), 4)),
                        PaymentMethod.CASH,
                        new BigDecimal("100.00"),
                        "Lifecycle sale"),
                employee);
        CashSessionDto closed = cashService.closeCashSession(
                opened.id(), new CashCloseRequest(new BigDecimal("200.00"), "Counted", null), employee);

        entityManager.clear();
        Order order = orderRepository.findById(sale.id()).orElseThrow();
        Payment payment =
                paymentRepository.findByOrderIdOrderByIdAsc(order.getId()).getFirst();
        List<StockMovement> movements = stockMovementRepository.findSaleMovementsByOrderId(order.getId());
        CashSession persistedSession =
                cashSessionRepository.findById(opened.id()).orElseThrow();

        assertThat(order.getType()).isEqualTo(OrderType.POS);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getCashSessionId()).isEqualTo(opened.id());
        assertThat(payment.getProvider()).isEqualTo(PaymentProvider.MANUAL);
        assertThat(payment.getMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(payment.getCashSessionId()).isEqualTo(opened.id());
        assertThat(payment.getAmount()).isEqualByComparingTo("100.00");
        assertThat(movements)
                .extracting(
                        movement -> movement.getStockLot().getId(),
                        StockMovement::getQuantity,
                        StockMovement::getType,
                        StockMovement::getOrderId,
                        StockMovement::getReferenceType,
                        StockMovement::getReferenceId)
                .containsExactly(
                        tuple(
                                earliestLot.getId(),
                                new BigDecimal("-2.000"),
                                StockMovementType.POS_SALE,
                                order.getId(),
                                "ORDER",
                                order.getId()),
                        tuple(
                                laterLot.getId(),
                                new BigDecimal("-2.000"),
                                StockMovementType.POS_SALE,
                                order.getId(),
                                "ORDER",
                                order.getId()));
        assertLot(earliestLot.getId(), "0.000", StockLotStatus.DEPLETED);
        assertLot(laterLot.getId(), "1.000", StockLotStatus.ACTIVE);
        assertThat(persistedSession.getStatus()).isEqualTo(CashSessionStatus.CLOSED);
        assertThat(persistedSession.getExpectedCashAmount()).isEqualByComparingTo("200.00");
        assertThat(persistedSession.getCountedCashAmount()).isEqualByComparingTo("200.00");
        assertThat(persistedSession.getCashDifferenceAmount()).isEqualByComparingTo("0.00");
        assertThat(closed.totalsByMethod().paymentsByMethod())
                .containsExactly(Map.entry("CASH", new BigDecimal("100.00")));
    }

    @Test
    void onlineLifecycleCreatesPreferenceAndApprovedWebhookDeductsExactlyOnce() throws Exception {
        Product product = persistProduct("Online lifecycle product", "7791000000002", "10.00");
        StockLot earliestLot = persistLot(product, "2.000", LocalDate.of(2030, 1, 1), "ONLINE-EARLY");
        StockLot laterLot = persistLot(product, "3.000", LocalDate.of(2030, 2, 1), "ONLINE-LATE");
        OnlineCheckout checkout = createOnlineCheckout(
                List.of(new CreateOnlineOrderItemRequest(product.getId(), new BigDecimal("4.000"))), "PREF-APPROVED");
        stubProviderPayment(checkout, "PAY-APPROVED", "approved");

        notifyProviderPayment("PAY-APPROVED");
        notifyProviderPayment("PAY-APPROVED");

        entityManager.clear();
        Order order = orderRepository.findById(checkout.orderId()).orElseThrow();
        List<Payment> payments = paymentRepository.findByOrderIdOrderByIdAsc(order.getId());
        List<StockMovement> movements = stockMovementRepository.findSaleMovementsByOrderId(order.getId());

        assertThat(order.getType()).isEqualTo(OrderType.ONLINE);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaidAt()).isNotNull();
        assertThat(payments)
                .extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.CANCELLED, PaymentStatus.APPROVED);
        assertThat(payments.getLast().getId()).isEqualTo(checkout.paymentId());
        assertThat(payments.getLast().getProviderPaymentId()).isEqualTo("PAY-APPROVED");
        assertThat(movements)
                .extracting(
                        movement -> movement.getStockLot().getId(),
                        StockMovement::getQuantity,
                        StockMovement::getType,
                        StockMovement::getOrderId,
                        StockMovement::getReferenceType,
                        StockMovement::getReferenceId)
                .containsExactly(
                        tuple(
                                earliestLot.getId(),
                                new BigDecimal("-2.000"),
                                StockMovementType.ONLINE_SALE,
                                order.getId(),
                                "ORDER",
                                order.getId()),
                        tuple(
                                laterLot.getId(),
                                new BigDecimal("-2.000"),
                                StockMovementType.ONLINE_SALE,
                                order.getId(),
                                "ORDER",
                                order.getId()));
        assertLot(earliestLot.getId(), "0.000", StockLotStatus.DEPLETED);
        assertLot(laterLot.getId(), "1.000", StockLotStatus.ACTIVE);
        verify(paymentGateway, times(2)).findPayment("PAY-APPROVED");
    }

    @Test
    void rejectedWebhookPersistsFailureWithoutStockEffects() throws Exception {
        Product product = persistProduct("Rejected payment product", "7791000000003", "15.00");
        StockLot lot = persistLot(product, "4.000", LocalDate.of(2030, 3, 1), "REJECTED-LOT");
        OnlineCheckout checkout = createOnlineCheckout(
                List.of(new CreateOnlineOrderItemRequest(product.getId(), new BigDecimal("2.000"))), "PREF-REJECTED");
        stubProviderPayment(checkout, "PAY-REJECTED", "rejected");

        notifyProviderPayment("PAY-REJECTED");

        entityManager.clear();
        Order order = orderRepository.findById(checkout.orderId()).orElseThrow();
        Payment payment = paymentRepository.findById(checkout.paymentId()).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAYMENT_FAILED);
        assertThat(order.getCancellationReason()).startsWith("MP_REJECTED:");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REJECTED);
        assertThat(stockMovementRepository.findSaleMovementsByOrderId(order.getId()))
                .isEmpty();
        assertLot(lot.getId(), "4.000", StockLotStatus.ACTIVE);
    }

    @Test
    void approvedWebhookCommitsStockConflictWithoutPartialCrossItemDeduction() throws Exception {
        Product availableProduct = persistProduct("Available conflict product", "7791000000004", "10.00");
        Product depletedProduct = persistProduct("Depleted conflict product", "7791000000005", "20.00");
        StockLot availableLot = persistLot(availableProduct, "2.000", LocalDate.of(2030, 4, 1), "CONFLICT-AVAILABLE");
        StockLot depletedLot = persistLot(depletedProduct, "2.000", LocalDate.of(2030, 5, 1), "CONFLICT-DEPLETED");
        OnlineCheckout checkout = createOnlineCheckout(
                List.of(
                        new CreateOnlineOrderItemRequest(availableProduct.getId(), new BigDecimal("2.000")),
                        new CreateOnlineOrderItemRequest(depletedProduct.getId(), new BigDecimal("2.000"))),
                "PREF-CONFLICT");
        reduceAvailableQuantity(depletedLot.getId(), "1.000");
        stubProviderPayment(checkout, "PAY-CONFLICT", "approved");

        notifyProviderPayment("PAY-CONFLICT");

        entityManager.clear();
        Order order = orderRepository.findById(checkout.orderId()).orElseThrow();
        Payment payment = paymentRepository.findById(checkout.paymentId()).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.STOCK_CONFLICT);
        assertThat(order.getCancellationReason()).isEqualTo("STOCK_CONFLICT_AT_DEDUCTION");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(stockMovementRepository.findSaleMovementsByOrderId(order.getId()))
                .isEmpty();
        assertLot(availableLot.getId(), "2.000", StockLotStatus.ACTIVE);
        assertLot(depletedLot.getId(), "1.000", StockLotStatus.ACTIVE);
    }

    private OnlineCheckout createOnlineCheckout(List<CreateOnlineOrderItemRequest> items, String preferenceId) {
        OrderCreatedDto created = customerOrderService.createOnlineOrder(
                new CreateOnlineOrderRequest(branch.getId(), items, "Pickup lifecycle"), customer);
        Order pendingOrder = orderRepository.findById(created.id()).orElseThrow();
        assertThat(pendingOrder.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(paymentRepository.findByOrderIdOrderByIdAsc(created.id()))
                .extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.PENDING);
        assertThat(stockMovementRepository.findSaleMovementsByOrderId(created.id()))
                .isEmpty();

        when(paymentGateway.createPreference(any(CreatePreferenceCommand.class)))
                .thenReturn(new PaymentPreferenceResult(preferenceId, INIT_POINT, null));
        CreatePreferenceResponse preference = preferenceService.createPreference(created.id(), customer);

        ArgumentCaptor<CreatePreferenceCommand> commandCaptor = ArgumentCaptor.forClass(CreatePreferenceCommand.class);
        verify(paymentGateway).createPreference(commandCaptor.capture());
        CreatePreferenceCommand command = commandCaptor.getValue();
        assertThat(command.orderId()).isEqualTo(created.id());
        assertThat(command.orderNumber()).isEqualTo(created.orderNumber());
        assertThat(command.externalReference()).isEqualTo(created.orderNumber());
        assertThat(command.amount()).isEqualByComparingTo(created.total());
        assertThat(command.items()).hasSize(items.size());
        assertThat(preference.preferenceId()).isEqualTo(preferenceId);
        assertThat(preference.initPoint()).isEqualTo(INIT_POINT);
        assertThat(paymentRepository.findByOrderIdOrderByIdAsc(created.id()))
                .extracting(Payment::getStatus)
                .containsExactly(PaymentStatus.CANCELLED, PaymentStatus.PENDING);
        return new OnlineCheckout(
                created.id(), created.orderNumber(), preference.paymentId(), preferenceId, created.total());
    }

    private void stubProviderPayment(OnlineCheckout checkout, String providerPaymentId, String providerStatus) {
        when(paymentGateway.findPayment(providerPaymentId))
                .thenReturn(Optional.of(new GatewayPaymentLookup(
                        providerPaymentId,
                        providerStatus,
                        checkout.total(),
                        "ARS",
                        Map.of(
                                "preference_id", checkout.preferenceId(),
                                "external_reference", checkout.orderNumber()))));
    }

    private void notifyProviderPayment(String providerPaymentId) throws Exception {
        String timestamp = "1700000000";
        String requestId = "lifecycle-" + providerPaymentId;
        String signature = "ts=" + timestamp + ",v1="
                + hmac(
                        WEBHOOK_SECRET,
                        "id:" + providerPaymentId.toLowerCase(java.util.Locale.ROOT) + ";request-id:" + requestId
                                + ";ts:" + timestamp + ";");

        mockMvc.perform(post("/api/webhooks/mercadopago?data.id=" + providerPaymentId)
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
                                        .formatted(providerPaymentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
    }

    private Product persistProduct(String name, String barcode, String price) {
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(new BigDecimal(price));
        product.setMinimumStock(1);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        product.setActive(true);
        return productRepository.saveAndFlush(product);
    }

    private StockLot persistLot(Product product, String quantity, LocalDate expirationDate, String lotCode) {
        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(new BigDecimal(quantity));
        lot.setQuantityAvailable(new BigDecimal(quantity));
        lot.setUnitCost(new BigDecimal("5.00"));
        lot.setCostPrice(new BigDecimal("5.00"));
        lot.setLotCode(lotCode);
        lot.setExpirationDate(expirationDate);
        lot.setStatus(StockLotStatus.ACTIVE);
        return stockLotRepository.saveAndFlush(lot);
    }

    private void reduceAvailableQuantity(Long lotId, String quantity) {
        transactionTemplate.executeWithoutResult(status -> {
            StockLot lot = stockLotRepository.findById(lotId).orElseThrow();
            lot.setQuantityAvailable(new BigDecimal(quantity));
            stockLotRepository.saveAndFlush(lot);
        });
        entityManager.clear();
    }

    private void assertLot(Long lotId, String expectedQuantity, StockLotStatus expectedStatus) {
        StockLot lot = stockLotRepository.findById(lotId).orElseThrow();
        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo(expectedQuantity);
        assertThat(lot.getStatus()).isEqualTo(expectedStatus);
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

    private record OnlineCheckout(
            Long orderId, String orderNumber, Long paymentId, String preferenceId, BigDecimal total) {}
}
