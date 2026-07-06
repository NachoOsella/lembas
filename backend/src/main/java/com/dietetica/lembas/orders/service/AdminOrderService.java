package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.inventory.service.InventoryService;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.shared.dto.PageResponse;
import com.dietetica.lembas.shared.exception.DomainException;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * Admin-facing use cases for order lifecycle management.
 *
 * <p>Provides the preparation, ready, delivery, and cancellation transitions
 * for ONLINE orders, plus filtered listing and detail retrieval. All write
 * operations delegate transition validation to {@link OrderStatePolicy}.
 * Cancellation additionally triggers stock reversal through
 * {@link InventoryService#reverseMovementsForOrder(Long)} when the order had
 * previously deducted stock.</p>
 */
@Service
public class AdminOrderService {

    private static final Logger log = LoggerFactory.getLogger(AdminOrderService.class);

    /** Error code returned when an order is not found. */
    public static final String CODE_ORDER_NOT_FOUND = "ORDER_NOT_FOUND";
    /** Error code returned when cancellation reason is missing or invalid. */
    public static final String CODE_CANCEL_REASON_REQUIRED = "CANCEL_REASON_REQUIRED";
    /** Error code returned when a refund conflict prevents cancellation. */
    public static final String CODE_REFUNDED_CONFLICT = "ORDER_REFUNDED_CONFLICT";

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final OrderStatePolicy statePolicy;
    private final InventoryService inventoryService;
    private final SecurityContextHelper securityContextHelper;

    public AdminOrderService(
            OrderRepository orderRepository,
            OrderMapper orderMapper,
            InventoryService inventoryService,
            SecurityContextHelper securityContextHelper
    ) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.statePolicy = new OrderStatePolicy();
        this.inventoryService = inventoryService;
        this.securityContextHelper = securityContextHelper;
    }

    // ----------------------------------------------------------------
    // Lifecycle transitions
    // ----------------------------------------------------------------

    /**
     * Transitions an ONLINE order from PAID to PREPARING.
     *
     * @param orderId the order id
     * @return the updated order detail
     */
    @Transactional
    public OrderDetailDto prepare(Long orderId) {
        return transition(orderId, OrderStatus.PREPARING,
                order -> order.setPreparedAt(OffsetDateTime.now()));
    }

    /**
     * Transitions an ONLINE order from PREPARING to READY.
     *
     * @param orderId the order id
     * @return the updated order detail
     */
    @Transactional
    public OrderDetailDto markReady(Long orderId) {
        return transition(orderId, OrderStatus.READY,
                order -> order.setReadyAt(OffsetDateTime.now()));
    }

    /**
     * Transitions an ONLINE order from READY to DELIVERED.
     *
     * @param orderId the order id
     * @return the updated order detail
     */
    @Transactional
    public OrderDetailDto deliver(Long orderId) {
        return transition(orderId, OrderStatus.DELIVERED,
                order -> order.setDeliveredAt(OffsetDateTime.now()));
    }

    /**
     * Cancels an order from any non-terminal state, reverses any deducted stock
     * to the original lots, and marks payments as CANCELLED.
     *
     * <p>Allowed for ONLINE orders in PENDING_PAYMENT, PAID, PREPARING, READY,
     * PAYMENT_FAILED, and STOCK_CONFLICT, and for POS orders in PAID. Rejected
     * with {@code ORDER_INVALID_STATE} (409) when the order is DELIVERED or
     * already CANCELLED, with {@code CANCEL_REASON_REQUIRED} (400) when the
     * reason is blank, and with {@code ORDER_REFUNDED_CONFLICT} (409) when any
     * payment has already been REFUNDED.</p>
     *
     * <p>Stock reversal is delegated to
     * {@link InventoryService#reverseMovementsForOrder(Long)} and is a no-op for
     * orders that never had stock deducted. Payments in PENDING or APPROVED
     * are transitioned to CANCELLED; payments already in REJECTED, EXPIRED,
     * CANCELLED, or REFUNDED are left untouched.</p>
     *
     * @param orderId the order id
     * @param reason  the mandatory cancellation reason (1-500 characters)
     * @return the updated order detail
     */
    @Transactional
    public OrderDetailDto cancel(Long orderId, String reason) {
        String normalizedReason = reason == null ? null : reason.trim();
        if (normalizedReason == null || normalizedReason.isEmpty()) {
            throw new DomainException(CODE_CANCEL_REASON_REQUIRED, HttpStatus.BAD_REQUEST,
                    "Cancellation reason is required");
        }
        if (normalizedReason.length() > 500) {
            throw new DomainException(CODE_CANCEL_REASON_REQUIRED, HttpStatus.BAD_REQUEST,
                    "Reason must be 1-500 characters");
        }

        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new DomainException(CODE_ORDER_NOT_FOUND, HttpStatus.NOT_FOUND,
                        "Order not found"));

        // 1. State policy: rejects DELIVERED, CANCELLED, and null.
        statePolicy.validateTransition(order, OrderStatus.CANCELLED);

        // 2. Refund sanity: cannot cancel if any payment has been REFUNDED.
        boolean hasRefundedPayment = order.getPayments().stream()
                .anyMatch(p -> p.getStatus() == PaymentStatus.REFUNDED);
        if (hasRefundedPayment) {
            throw new DomainException(CODE_REFUNDED_CONFLICT, HttpStatus.CONFLICT,
                    "Cannot cancel an order with refunded payments");
        }

        // 3. Stock reversal (no-op for orders that never deducted stock).
        int reversedCount = inventoryService.reverseMovementsForOrder(order.getId());
        if (reversedCount > 0) {
            log.info("Reversed {} stock movements for order {}", reversedCount, order.getOrderNumber());
        }

        // 4. Update payment status: PENDING, APPROVED -> CANCELLED.
        for (Payment payment : order.getPayments()) {
            if (payment.getStatus() == PaymentStatus.PENDING
                    || payment.getStatus() == PaymentStatus.APPROVED) {
                payment.setStatus(PaymentStatus.CANCELLED);
            }
        }

        // 5. Update order state.
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(OffsetDateTime.now());
        order.setCancellationReason(normalizedReason);
        Order saved = orderRepository.save(order);

        // 6. Audit.
        Long userId = securityContextHelper.getCurrentUser() == null
                ? null : securityContextHelper.getCurrentUser().getId();
        log.info("Order {} cancelled by user {} (reason: {})",
                saved.getOrderNumber(), userId, normalizedReason);
        return orderMapper.toDetailDto(saved);
    }

    // ----------------------------------------------------------------
    // Read operations
    // ----------------------------------------------------------------

    /**
     * Returns a paginated, filtered list of orders for the admin panel.
     *
     * <p>Applies the following filters:
     * <ul>
     *   <li>{@code status}, {@code type} -- exact match when provided.</li>
     *   <li>{@code from} / {@code to} -- inclusive start / exclusive end of the
     *       {@code createdAt} range, both optional.</li>
     *   <li>{@code search} -- case-insensitive LIKE on {@code orderNumber} and
     *       {@code customerNameSnapshot} when provided. Leading/trailing
     *       whitespace is trimmed before matching.</li>
     *   <li>{@code branchId} -- exact match when provided. For non-ADMIN users
     *       (MANAGER / EMPLOYEE) the value is forced to the user's assigned
     *       branch even if the caller supplied a different one. ADMIN can
     *       pass any value or null to query all branches.</li>
     * </ul></p>
     *
     * @param status   optional filter by order status
     * @param branchId optional filter by branch; ignored / overridden for non-ADMIN users
     * @param type     optional filter by order type
     * @param from     optional inclusive start date (createdAt >= from)
     * @param to       optional exclusive end date (createdAt < to + 1 day)
     * @param search   optional free-text search on order number and customer name
     * @param pageable pagination and sort (defaults to createdAt DESC)
     * @return a page of order summaries
     */
    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryDto> listOrders(
            OrderStatus status,
            Long branchId,
            OrderType type,
            LocalDate from,
            LocalDate to,
            String search,
            Pageable pageable
    ) {
        Long effectiveBranchId = resolveBranchFilter(branchId);
        Specification<Order> spec = buildFilterSpec(status, effectiveBranchId, type, from, to, search);
        Pageable sortedPageable = ensureDefaultSort(pageable);
        Page<Order> page = orderRepository.findAll(spec, sortedPageable);
        return PageResponse.from(page.map(orderMapper::toSummaryDto));
    }

    /**
     * Resolves the effective branch filter for the current request.
     *
     * <p>ADMIN users keep whatever branch filter they supplied (or null for all
     * branches). MANAGER and EMPLOYEE users are always scoped to their assigned
     * branch, even if they pass a different value or pass null. The override is
     * applied silently because the UI for those roles also locks the filter.</p>
     *
     * @param requestedBranchId the branch id supplied by the caller
     * @return the effective branch id to apply in the query
     */
    private Long resolveBranchFilter(Long requestedBranchId) {
        var currentUser = securityContextHelper.getCurrentUser();
        if (currentUser == null) {
            return requestedBranchId;
        }
        com.dietetica.lembas.users.model.Role role = currentUser.getRole();
        if (role == com.dietetica.lembas.users.model.Role.ADMIN) {
            return requestedBranchId;
        }
        Long userBranchId = currentUser.getBranchId();
        if (userBranchId == null) {
            // Non-ADMIN user without a branch is a data integrity issue;
            // restrict the listing to a non-existent branch so the result is empty
            // instead of leaking other branches' data.
            return -1L;
        }
        return userBranchId;
    }

    /**
     * Returns the full detail for a single order.
     *
     * @param orderId the order id
     * @return the order detail DTO
     * @throws DomainException if the order does not exist
     */
    @Transactional(readOnly = true)
    public OrderDetailDto getOrder(Long orderId) {
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new DomainException(CODE_ORDER_NOT_FOUND, HttpStatus.NOT_FOUND,
                        "Order not found"));
        return orderMapper.toDetailDto(order);
    }

    // ----------------------------------------------------------------
    // Internal helpers
    // ----------------------------------------------------------------

    /**
     * Shared transition logic: load, validate, apply state+timestamp, persist.
     */
    private OrderDetailDto transition(Long orderId, OrderStatus target,
                                      Consumer<Order> timestampSetter) {
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new DomainException(CODE_ORDER_NOT_FOUND, HttpStatus.NOT_FOUND,
                        "Order not found"));
        statePolicy.validateTransition(order, target);
        order.setStatus(target);
        timestampSetter.accept(order);
        Order saved = orderRepository.save(order);
        log.info("Order {} transitioned to {} by admin", saved.getOrderNumber(), target);
        return orderMapper.toDetailDto(saved);
    }

    /**
     * Builds a JPA {@link Specification} from the optional filter parameters.
     *
     * <p>When {@code search} is provided it is normalised (trimmed, lowercased)
     * and matched as a case-insensitive LIKE on either {@code orderNumber} or
     * {@code customerNameSnapshot}. Empty / blank input is treated as no filter.</p>
     */
    private Specification<Order> buildFilterSpec(
            OrderStatus status, Long branchId, OrderType type,
            LocalDate from, LocalDate to, String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (branchId != null) {
                predicates.add(cb.equal(root.get("branch").get("id"), branchId));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (from != null) {
                OffsetDateTime fromStart = from.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromStart));
            }
            if (to != null) {
                OffsetDateTime toEnd = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
                predicates.add(cb.lessThan(root.get("createdAt"), toEnd));
            }
            if (search != null) {
                String pattern = buildSearchPattern(search);
                if (pattern != null) {
                    Predicate orderNumberMatch = cb.like(
                            cb.lower(root.get("orderNumber")), pattern);
                    Predicate customerMatch = cb.like(
                            cb.lower(root.get("customerNameSnapshot")), pattern);
                    predicates.add(cb.or(orderNumberMatch, customerMatch));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Normalises a search string into a SQL LIKE pattern, or null when empty.
     * Trims surrounding whitespace and escapes literal LIKE wildcards
     * ({@code %} and {@code _}) so they only match user input that contains
     * the character explicitly.
     */
    private String buildSearchPattern(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String escaped = trimmed
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped.toLowerCase() + "%";
    }

    /**
     * Ensures a default sort (createdAt DESC) when the client omits sorting.
     */
    private Pageable ensureDefaultSort(Pageable pageable) {
        if (pageable.getSort().isSorted()) {
            return pageable;
        }
        return PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
    }
}
