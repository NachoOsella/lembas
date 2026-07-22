package com.dietetica.lembas.pos.service;

import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PosStockCommand;
import com.dietetica.lembas.orders.api.OrderCommand;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.service.OrderMapper;
import com.dietetica.lembas.orders.service.OrderNumberGenerator;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use cases for in-store (POS) sales.
 *
 * <p>The single public entry point, {@link #createSale(CreatePosSaleRequest, User)},
 * executes the entire cash-register flow inside a single transaction:</p>
 *
 * <ol>
 *   <li>Resolve the OPEN cash session for the cashier's branch.</li>
 *   <li>Load each product and build the unified {@code Order} aggregate
 *       ({@code POS}, {@code PAID}, item and cashier snapshots, cash session).</li>
 *   <li>Record the approved manual payment.</li>
 *   <li>Persist the order, then invoke inventory's POS contract to apply FEFO
 *       deductions and linked {@code POS_SALE} movements.</li>
 * </ol>
 *
 * <p>The single transaction guarantees that the order, payment, movements, and
 * lot updates either all commit together or all roll back, so the cashier
 * never sees a sale without a stock deduction or a payment without an
 * order.</p>
 */
@Service
public class PosSaleService {

    private static final Logger log = LoggerFactory.getLogger(PosSaleService.class);

    private final CashService cashService;
    private final ProductLookup productLookup;
    private final PosStockCommand posStockCommand;
    private final OrderCommand orderCommand;
    private final OrderNumberGenerator orderNumberGenerator;
    private final OrderMapper orderMapper;
    private final BranchQuery branchQuery;
    private final ObjectMapper objectMapper;

    public PosSaleService(
            CashService cashService,
            ProductLookup productLookup,
            PosStockCommand posStockCommand,
            OrderCommand orderCommand,
            OrderNumberGenerator orderNumberGenerator,
            OrderMapper orderMapper,
            BranchQuery branchQuery,
            ObjectMapper objectMapper) {
        this.cashService = cashService;
        this.productLookup = productLookup;
        this.posStockCommand = posStockCommand;
        this.orderCommand = orderCommand;
        this.orderNumberGenerator = orderNumberGenerator;
        this.orderMapper = orderMapper;
        this.branchQuery = branchQuery;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a POS sale atomically.
     *
     * @param request     the validated cart, payment method, and optional notes
     * @param currentUser the authenticated employee; their assigned branch is
     *                    used for MANAGER/EMPLOYEE users
     * @return the persisted order with all items, payments, and lifecycle fields
     * @throws DomainException {@code CASH_BRANCH_REQUIRED} (400) for cashiers
     *         without an assigned branch; {@code CASH_SESSION_NOT_FOUND} (404)
     *         when there is no OPEN session; {@code BRANCH_NOT_FOUND} (404) when
     *         the resolved branch is missing or inactive; {@code PRODUCT_NOT_FOUND}
     *         (404) for missing or inactive products; {@code INSUFFICIENT_STOCK}
     *         (409) when FEFO cannot cover the requested quantity.
     */
    @Transactional
    public OrderDetailDto createSale(CreatePosSaleRequest request, User currentUser) {
        return createSale(request, currentUser, null);
    }

    /**
     * Creates a POS sale against the selected branch for an administrator.
     *
     * <p>For MANAGER and EMPLOYEE users, {@code requestedBranchId} is ignored
     * and their assigned branch remains the sole source of authority.</p>
     *
     * @param request the validated cart, payment method, and optional notes
     * @param currentUser the authenticated internal user
     * @param requestedBranchId required for ADMIN; ignored for other internal roles
     * @return the persisted order with all items, payments, and lifecycle fields
     */
    @Transactional
    public OrderDetailDto createSale(CreatePosSaleRequest request, User currentUser, Long requestedBranchId) {
        CashSessionDto session = resolveOpenCashSession(currentUser, requestedBranchId);
        Branch branch = resolveBranch(session.branchId());

        // 1) Merge duplicate productId lines (scanner may send the same barcode twice)
        List<CreatePosSaleItemRequest> merged = mergeDuplicateItems(request.items());

        // 2) Build the order header. Items and payments are appended below.
        Order order = buildOrderHeader(branch, currentUser, session.id(), request.notes());

        // 3) Create immutable order-item snapshots before persisting the unified order.
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CreatePosSaleItemRequest itemReq : merged) {
            Product product = productLookup
                    .findActiveById(itemReq.productId())
                    .orElseThrow(() -> new DomainException(
                            "PRODUCT_NOT_FOUND",
                            HttpStatus.NOT_FOUND,
                            "Product " + itemReq.productId() + " not found or inactive"));

            BigDecimal lineTotal = snapshotOrderItem(order, product, itemReq.quantity());
            subtotal = subtotal.add(lineTotal);
        }

        order.setSubtotal(money(subtotal));
        order.setDiscountTotal(BigDecimal.ZERO.setScale(2));
        order.setTotal(money(subtotal));
        order.setPaidAt(OffsetDateTime.now());

        // 4) Manual payment (always APPROVED at the counter).
        Payment payment = buildPayment(order, session.id(), request.paymentMethod(), request.cashReceived());
        order.addPayment(payment);

        // 5) Persist cascade: order -> items + payments. The generated id lets inventory link
        // every FEFO movement to the unified order inside this same transaction.
        Order saved = orderCommand.save(order);
        posStockCommand.deductForPosOrder(saved.getId());

        log.info(
                "POS sale created: orderId={} number={} total={} method={} sessionId={}",
                saved.getId(),
                saved.getOrderNumber(),
                saved.getTotal(),
                request.paymentMethod(),
                session.id());

        return orderMapper.toDetailDto(saved);
    }

    // ---------------------------------------------------------------------------
    // Cash session resolution
    // ---------------------------------------------------------------------------

    /**
     * Resolves the OPEN cash session for the operator. ADMIN must provide a
     * selected branch; MANAGER and EMPLOYEE use their assigned branch. Lets
     * {@code CASH_SESSION_NOT_FOUND} propagate when there is no OPEN session.
     */
    private CashSessionDto resolveOpenCashSession(User currentUser, Long requestedBranchId) {
        if (currentUser.getRole() == Role.ADMIN) {
            if (requestedBranchId == null) {
                throw new DomainException(
                        "CASH_BRANCH_REQUIRED", HttpStatus.BAD_REQUEST, "ADMIN must select a branch before selling");
            }
            return cashService.getCurrentSessionForUpdate(requestedBranchId, currentUser);
        }
        if (currentUser.getBranchId() == null) {
            throw new DomainException(
                    "CASH_BRANCH_REQUIRED",
                    HttpStatus.BAD_REQUEST,
                    "Cashier has no assigned branch and must open a cash session before selling");
        }
        return cashService.getCurrentSessionForUpdate(null, currentUser);
    }

    private Branch resolveBranch(Long branchId) {
        return branchQuery
                .findActiveById(branchId)
                .orElseThrow(() -> new DomainException(
                        "BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch " + branchId + " not found or inactive"));
    }

    // ---------------------------------------------------------------------------
    // Order header
    // ---------------------------------------------------------------------------

    private Order buildOrderHeader(Branch branch, User currentUser, Long cashSessionId, String notes) {
        Order order = new Order();
        order.setOrderNumber(orderNumberGenerator.next(OrderType.POS));
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setBranch(branch);
        order.setCreatedByUser(currentUser);
        order.setCashSessionId(cashSessionId);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setNotes(normalizeBlank(notes));
        // POS orders have no online customer; use a label so reports/arqueo
        // can identify the cashier without joining users.
        order.setCustomerNameSnapshot(buildCashierLabel(currentUser));
        order.setCustomerEmailSnapshot(null);
        order.setCustomerPhoneSnapshot(null);
        return order;
    }

    // ---------------------------------------------------------------------------
    // Order-item snapshots
    // ---------------------------------------------------------------------------

    /** Appends an immutable POS order-item snapshot before inventory deducts the persisted order. */
    private BigDecimal snapshotOrderItem(Order order, Product product, int quantity) {
        BigDecimal lineSubtotal = product.getSalePrice().multiply(BigDecimal.valueOf(quantity));

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(BigDecimal.valueOf(quantity));
        item.setUnitPrice(product.getSalePrice());
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(lineSubtotal);
        item.setProductNameSnapshot(product.getName());
        item.setProductBarcodeSnapshot(product.getBarcode());
        item.setCategoryIdSnapshot(
                product.getCategory() == null ? null : product.getCategory().getId());
        item.setCategoryNameSnapshot(
                product.getCategory() == null ? null : product.getCategory().getName());
        // costPriceSnapshot intentionally left null for POS: it is admin/COGS
        // information that the cashier should not see in the response.
        order.addItem(item);

        return lineSubtotal;
    }

    // ---------------------------------------------------------------------------
    // Payment
    // ---------------------------------------------------------------------------

    private Payment buildPayment(Order order, Long cashSessionId, PaymentMethod method, BigDecimal cashReceived) {
        Payment payment = new Payment();
        payment.setProvider(PaymentProvider.MANUAL);
        payment.setMethod(method);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(order.getTotal());
        payment.setCurrency("ARS");
        payment.setCashSessionId(cashSessionId);
        payment.setApprovedAt(OffsetDateTime.now());
        if (cashReceived != null) {
            payment.setMetadata(serializeMetadata(Map.of("cashReceived", cashReceived.toPlainString())));
        }
        return payment;
    }

    private String serializeMetadata(Map<String, ?> metadata) {
        try {
            return objectMapper.writeValueAsString(new LinkedHashMap<>(metadata));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize POS payment metadata", ex);
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static List<CreatePosSaleItemRequest> mergeDuplicateItems(List<CreatePosSaleItemRequest> items) {
        Map<Long, Integer> byProduct = new LinkedHashMap<>();
        for (CreatePosSaleItemRequest it : items) {
            byProduct.merge(it.productId(), it.quantity(), Integer::sum);
        }
        return byProduct.entrySet().stream()
                .map(e -> new CreatePosSaleItemRequest(e.getKey(), e.getValue()))
                .toList();
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String normalizeBlank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String buildCashierLabel(User user) {
        String firstName =
                user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        if (fullName.isEmpty()) {
            return "Venta POS";
        }
        return "Venta POS - " + fullName;
    }
}
