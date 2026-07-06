package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
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
 * <p>Provides the preparation, ready, and delivery transitions for ONLINE
 * orders, plus filtered listing and detail retrieval. All write operations
 * delegate transition validation to {@link OrderStatePolicy}.</p>
 */
@Service
public class AdminOrderService {

    private static final Logger log = LoggerFactory.getLogger(AdminOrderService.class);
    private static final String CODE_ORDER_NOT_FOUND = "ORDER_NOT_FOUND";

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final OrderStatePolicy statePolicy;

    public AdminOrderService(OrderRepository orderRepository, OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.statePolicy = new OrderStatePolicy();
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

    // ----------------------------------------------------------------
    // Read operations
    // ----------------------------------------------------------------

    /**
     * Returns a paginated, filtered list of orders for the admin panel.
     *
     * @param status   optional filter by order status
     * @param branchId optional filter by branch
     * @param type     optional filter by order type
     * @param from     optional inclusive start date (createdAt >= from)
     * @param to       optional exclusive end date (createdAt < to + 1 day)
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
            Pageable pageable
    ) {
        Specification<Order> spec = buildFilterSpec(status, branchId, type, from, to);
        Pageable sortedPageable = ensureDefaultSort(pageable);
        Page<Order> page = orderRepository.findAll(spec, sortedPageable);
        return PageResponse.from(page.map(orderMapper::toSummaryDto));
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
     */
    private Specification<Order> buildFilterSpec(
            OrderStatus status, Long branchId, OrderType type,
            LocalDate from, LocalDate to
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

            return cb.and(predicates.toArray(new Predicate[0]));
        };
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
