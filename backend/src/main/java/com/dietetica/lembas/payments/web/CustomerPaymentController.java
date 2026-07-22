package com.dietetica.lembas.payments.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.payments.api.CustomerPaymentQuery;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.dto.PaymentSummaryDto;
import com.dietetica.lembas.payments.service.PreferenceService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for authenticated customers to start and inspect online
 * payments associated with one of their orders.
 */
@RestController
@RequestMapping("/api/customer/orders/{orderId}/payments")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerPaymentController {

    private final PreferenceService preferenceService;
    private final CustomerPaymentQuery customerPaymentQuery;
    private final SecurityContextHelper securityContextHelper;

    public CustomerPaymentController(
            PreferenceService preferenceService,
            CustomerPaymentQuery customerPaymentQuery,
            SecurityContextHelper securityContextHelper) {
        this.preferenceService = preferenceService;
        this.customerPaymentQuery = customerPaymentQuery;
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

    /**
     * Returns the payment attempts recorded for the order.
     *
     * <p>Ownership is enforced inside the payment-owned query service, so this
     * controller only coordinates the authenticated customer and HTTP response.</p>
     */
    @GetMapping
    public List<PaymentSummaryDto> list(@PathVariable Long orderId) {
        Long customerId = securityContextHelper.getCurrentUser().getId();
        return customerPaymentQuery.findForCustomerOrder(orderId, customerId);
    }
}
