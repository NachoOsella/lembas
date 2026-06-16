package com.dietetica.lembas.orders.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderRequest;
import com.dietetica.lembas.orders.dto.OrderCreatedDto;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.service.CustomerOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** REST endpoints used by authenticated customers to create and inspect their online orders. */
@RestController
@RequestMapping("/api/customer/orders")
public class CustomerOrderController {

    private final CustomerOrderService customerOrderService;
    private final SecurityContextHelper securityContextHelper;

    public CustomerOrderController(
            CustomerOrderService customerOrderService,
            SecurityContextHelper securityContextHelper
    ) {
        this.customerOrderService = customerOrderService;
        this.securityContextHelper = securityContextHelper;
    }

    /** Creates an online pickup order in PENDING_PAYMENT state without stock reservation. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderCreatedDto create(@Valid @RequestBody CreateOnlineOrderRequest request) {
        return customerOrderService.createOnlineOrder(request, securityContextHelper.getCurrentUser());
    }

    /** Returns the authenticated customer's own orders. */
    @GetMapping
    public List<OrderSummaryDto> list() {
        return customerOrderService.listCustomerOrders(securityContextHelper.getCurrentUser());
    }

    /** Returns the authenticated customer's own order detail. */
    @GetMapping("/{id}")
    public OrderDetailDto detail(@PathVariable Long id) {
        return customerOrderService.getCustomerOrder(id, securityContextHelper.getCurrentUser());
    }
}
