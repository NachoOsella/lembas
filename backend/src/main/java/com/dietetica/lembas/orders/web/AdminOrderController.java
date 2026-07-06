package com.dietetica.lembas.orders.web;

import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.service.AdminOrderService;
import com.dietetica.lembas.shared.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Admin REST endpoints for order lifecycle management.
 *
 * <p>All endpoints require ADMIN, MANAGER, or EMPLOYEE roles via the
 * global {@code SecurityConfig}. The preparation/ready/delivery flow
 * only applies to ONLINE orders; POS transitions are rejected by
 * {@code OrderStatePolicy}.</p>
 */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    public AdminOrderController(AdminOrderService adminOrderService) {
        this.adminOrderService = adminOrderService;
    }

    /**
     * Returns a paginated, filterable list of orders.
     */
    @GetMapping
    public PageResponse<OrderSummaryDto> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) OrderType type,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            Pageable pageable
    ) {
        return adminOrderService.listOrders(status, branchId, type, from, to, pageable);
    }

    /**
     * Returns full order detail including items, payments, and status timestamps.
     */
    @GetMapping("/{id}")
    public OrderDetailDto detail(@PathVariable Long id) {
        return adminOrderService.getOrder(id);
    }

    /**
     * Transitions the order to PREPARING (employee starts assembling the order).
     */
    @PatchMapping("/{id}/prepare")
    public OrderDetailDto prepare(@PathVariable Long id) {
        return adminOrderService.prepare(id);
    }

    /**
     * Transitions the order to READY (order is ready for customer pickup).
     */
    @PatchMapping("/{id}/ready")
    public OrderDetailDto markReady(@PathVariable Long id) {
        return adminOrderService.markReady(id);
    }

    /**
     * Transitions the order to DELIVERED (customer picked up at the branch).
     */
    @PatchMapping("/{id}/delivered")
    public OrderDetailDto deliver(@PathVariable Long id) {
        return adminOrderService.deliver(id);
    }
}
