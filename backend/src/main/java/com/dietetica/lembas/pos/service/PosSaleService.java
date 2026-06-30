package com.dietetica.lembas.pos.service;

import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.orders.service.OrderMapper;
import com.dietetica.lembas.orders.service.OrderNumberGenerator;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Use cases for in-store (POS) sales.
 *
 * <p>The single public entry point, {@link #createSale(CreatePosSaleRequest, User)},
 * executes the entire cash-register flow inside a single transaction:</p>
 *
 * <ol>
 *   <li>Resolve the OPEN cash session for the cashier's branch.</li>
 *   <li>Load each product, plan a FEFO stock deduction with pessimistic locks,
 *       persist the new lot balances.</li>
 *   <li>Append {@code StockMovement} rows of type {@code POS_SALE} (signed
 *       negative) for every lot touched, with the lot's unit cost snapshot.</li>
 *   <li>Build the {@code Order} aggregate ({@code POS}, {@code PAID}, with
 *       order items, customer/cashier snapshots, and the cash session id).</li>
 *   <li>Record the manual payment ({@code PaymentProvider.MANUAL},
 *       {@code PaymentStatus.APPROVED}, same cash session).</li>
 *   <li>Persist the order and backfill the per-movement order ids.</li>
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
    private final ProductRepository productRepository;
    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final FefoStockDeductionPolicy fefoPolicy;
    private final OrderRepository orderRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final OrderMapper orderMapper;
    private final BranchRepository branchRepository;
    private final ObjectMapper objectMapper;

    public PosSaleService(
            CashService cashService,
            ProductRepository productRepository,
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            FefoStockDeductionPolicy fefoPolicy,
            OrderRepository orderRepository,
            OrderNumberGenerator orderNumberGenerator,
            OrderMapper orderMapper,
            BranchRepository branchRepository,
            ObjectMapper objectMapper
    ) {
        this.cashService = cashService;
        this.productRepository = productRepository;
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.fefoPolicy = fefoPolicy;
        this.orderRepository = orderRepository;
        this.orderNumberGenerator = orderNumberGenerator;
        this.orderMapper = orderMapper;
        this.branchRepository = branchRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a POS sale atomically.
     *
     * @param request     the validated cart, payment method, and optional notes
     * @param currentUser the authenticated employee; the cashier's branch is
     *                    used to resolve the cash session and to scope stock
     *                    availability
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
        CashSessionDto session = resolveOpenCashSession(currentUser);
        Branch branch = resolveBranch(session.branchId());

        // 1) Merge duplicate productId lines (scanner may send the same barcode twice)
        List<CreatePosSaleItemRequest> merged = mergeDuplicateItems(request.items());

        // 2) Build the order header. Items and payments are appended below.
        Order order = buildOrderHeader(branch, currentUser, session.id(), request.notes());

        // 3) For each line: snapshot, FEFO deduction, movement, item.
        //    Movements are persisted in-line and tracked so we can backfill
        //    their orderId once the order has its generated id.
        List<StockMovement> pendingMovements = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CreatePosSaleItemRequest itemReq : merged) {
            Product product = productRepository.findByIdAndActiveTrue(itemReq.productId())
                    .orElseThrow(() -> new DomainException(
                            "PRODUCT_NOT_FOUND",
                            HttpStatus.NOT_FOUND,
                            "Product " + itemReq.productId() + " not found or inactive"));

            BigDecimal lineTotal = deductAndSnapshot(
                    order, product, branch, itemReq.quantity(), pendingMovements);
            subtotal = subtotal.add(lineTotal);
        }

        order.setSubtotal(money(subtotal));
        order.setDiscountTotal(BigDecimal.ZERO.setScale(2));
        order.setTotal(money(subtotal));
        order.setPaidAt(OffsetDateTime.now());

        // 4) Manual payment (always APPROVED at the counter).
        Payment payment = buildPayment(order, session.id(), request.paymentMethod(), request.cashReceived());
        order.addPayment(payment);

        // 5) Persist cascade: order -> items + payments.
        Order saved = orderRepository.save(order);

        // 6) Backfill movement orderIds now that the order is persisted.
        for (StockMovement movement : pendingMovements) {
            movement.setOrderId(saved.getId());
        }
        stockMovementRepository.saveAll(pendingMovements);

        log.info("POS sale created: orderId={} number={} total={} method={} sessionId={}",
                saved.getId(), saved.getOrderNumber(), saved.getTotal(),
                request.paymentMethod(), session.id());

        return orderMapper.toDetailDto(saved);
    }

    // ---------------------------------------------------------------------------
    // Cash session resolution
    // ---------------------------------------------------------------------------

    /**
     * Resolves the OPEN cash session for the cashier. Throws
     * {@code CASH_BRANCH_REQUIRED} if the cashier has no branch (ADMIN without
     * assignment), and lets {@code CASH_SESSION_NOT_FOUND} propagate from
     * {@code CashService.getCurrentSession} when there is no OPEN session.
     */
    private CashSessionDto resolveOpenCashSession(User currentUser) {
        if (currentUser.getBranchId() == null) {
            throw new DomainException(
                    "CASH_BRANCH_REQUIRED",
                    HttpStatus.BAD_REQUEST,
                    "Cashier has no assigned branch and must open a cash session before selling");
        }
        return cashService.getCurrentSession(null, currentUser);
    }

    private Branch resolveBranch(Long branchId) {
        return branchRepository.findById(branchId)
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException(
                        "BRANCH_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Branch " + branchId + " not found or inactive"));
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
    // FEFO deduction + snapshot + movement
    // ---------------------------------------------------------------------------

    /**
     * Plans a FEFO deduction for {@code quantity} units of {@code product} at
     * {@code branch}, applies the lot updates, records one
     * {@code POS_SALE} movement per lot, and appends the corresponding
     * {@code OrderItem} to {@code order}.
     *
     * @param order              the order being built (mutated in place)
     * @param product            the catalog product
     * @param branch             the resolved branch
     * @param quantity           the requested quantity (positive integer)
     * @param pendingMovements   accumulator for movements created in this tx;
     *                           the caller backfills {@code orderId} after the
     *                           order is persisted
     * @return the per-line subtotal (sum of salePrice * quantityToDeduct)
     * @throws DomainException {@code INSUFFICIENT_STOCK} (409) when the
     *         available stock cannot cover the requested quantity; the policy
     *         raises this before any lot is mutated.
     */
    private BigDecimal deductAndSnapshot(
            Order order, Product product, Branch branch, int quantity,
            List<StockMovement> pendingMovements) {
        List<StockLot> lots = stockLotRepository.findAvailableLotsForUpdate(
                product.getId(), branch.getId());
        DeductionPlan plan = fefoPolicy.plan(lots, BigDecimal.valueOf(quantity));

        BigDecimal lineSubtotal = BigDecimal.ZERO;
        for (DeductionEntry entry : plan.entries()) {
            StockLot lot = stockLotRepository.findByIdForUpdate(entry.stockLotId())
                    .orElseThrow(() -> new DomainException(
                            "STOCK_LOT_NOT_FOUND",
                            HttpStatus.NOT_FOUND,
                            "Stock lot " + entry.stockLotId() + " disappeared mid-transaction"));

            // Apply the deduction. The lot stays in ACTIVE status with whatever
            // quantity remains (zero or positive); the convention used by
            // InventoryService for online sales.
            lot.setQuantityAvailable(entry.lotAvailableAfter());
            stockLotRepository.save(lot);

            // Record the per-lot movement with the lot's unit cost snapshot for
            // cost-of-goods-sold and margin reports.
            StockMovement movement = new StockMovement();
            movement.setStockLot(lot);
            movement.setProduct(product);
            movement.setBranch(branch);
            movement.setType(StockMovementType.POS_SALE);
            movement.setQuantity(entry.quantityToDeduct().negate()); // signed negative
            movement.setUnitCostSnapshot(lot.getUnitCost());
            movement.setReferenceType("POS_SALE");
            StockMovement savedMovement = stockMovementRepository.save(movement);
            pendingMovements.add(savedMovement);

            lineSubtotal = lineSubtotal.add(
                    product.getSalePrice().multiply(entry.quantityToDeduct()));
        }

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(BigDecimal.valueOf(quantity));
        item.setUnitPrice(product.getSalePrice());
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(lineSubtotal);
        item.setProductNameSnapshot(product.getName());
        item.setProductBarcodeSnapshot(product.getBarcode());
        // costPriceSnapshot intentionally left null for POS: it is admin/COGS
        // information that the cashier should not see in the response.
        order.addItem(item);

        return lineSubtotal;
    }

    // ---------------------------------------------------------------------------
    // Payment
    // ---------------------------------------------------------------------------

    private Payment buildPayment(
            Order order, Long cashSessionId, PaymentMethod method, BigDecimal cashReceived) {
        Payment payment = new Payment();
        payment.setProvider(PaymentProvider.MANUAL);
        payment.setMethod(method);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(order.getTotal());
        payment.setCurrency("ARS");
        payment.setCashSessionId(cashSessionId);
        payment.setApprovedAt(OffsetDateTime.now());
        if (cashReceived != null) {
            payment.setMetadata(serializeMetadata(Map.of(
                    "cashReceived", cashReceived.toPlainString()
            )));
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

    private static List<CreatePosSaleItemRequest> mergeDuplicateItems(
            List<CreatePosSaleItemRequest> items) {
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
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        if (fullName.isEmpty()) {
            return "Venta POS";
        }
        return "Venta POS - " + fullName;
    }
}
