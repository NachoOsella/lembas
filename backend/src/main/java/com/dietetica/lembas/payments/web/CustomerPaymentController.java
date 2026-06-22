package com.dietetica.lembas.payments.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.dto.PaymentSummaryDto;
import com.dietetica.lembas.payments.service.PaymentService;
import com.dietetica.lembas.payments.service.PreferenceService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST endpoints for authenticated customers to start and inspect online
 * payments associated with one of their orders.
 */
@RestController
@RequestMapping("/api/customer/orders/{orderId}/payments")
public class CustomerPaymentController {

    private final PreferenceService preferenceService;
    private final PaymentService paymentService;
    private final SecurityContextHelper securityContextHelper;

    public CustomerPaymentController(
            PreferenceService preferenceService,
            PaymentService paymentService,
            SecurityContextHelper securityContextHelper
    ) {
        this.preferenceService = preferenceService;
        this.paymentService = paymentService;
        this.securityContextHelper = securityContextHelper;
    }

    /**
     * Creates (or reuses) a Mercado Pago Checkout Pro preference for the order
     * and returns the URL the customer should be redirected to.
     */
    @PostMapping("/preference")
    @ResponseStatus(HttpStatus.OK)
    public CreatePreferenceResponse createPreference(@PathVariable Long orderId) {
        return preferenceService.createPreference(orderId, securityContextHelper.getCurrentUser());
    }

    /** Returns the payment attempts recorded for the order. */
    @GetMapping
    public List<PaymentSummaryDto> list(@PathVariable Long orderId) {
        // Ownership is enforced by the service: only the authenticated customer
        // can read payments for an order they own.
        Long customerId = securityContextHelper.getCurrentUser().getId();
        return paymentService.findByOrderId(orderId).stream()
                .filter(payment -> payment.getOrder() != null
                        && payment.getOrder().getCustomerUser() != null
                        && customerId.equals(payment.getOrder().getCustomerUser().getId()))
                .map(this::toDto)
                .toList();
    }

    /** Maps a payment entity to the lightweight DTO exposed to customers. */
    private PaymentSummaryDto toDto(com.dietetica.lembas.payments.model.Payment payment) {
        return new PaymentSummaryDto(
                payment.getId(),
                payment.getProvider(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getApprovedAt(),
                payment.getCreatedAt()
        );
    }
}
