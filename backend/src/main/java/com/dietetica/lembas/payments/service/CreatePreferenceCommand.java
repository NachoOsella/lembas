package com.dietetica.lembas.payments.service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Immutable input for {@link PaymentGateway#createPreference(CreatePreferenceCommand)}.
 *
 * <p>Built by the application layer from an {@link com.dietetica.lembas.orders.model.Order}
 * so the gateway stays decoupled from JPA entities.</p>
 *
 * @param orderId           internal order id used as correlation key
 * @param orderNumber       human-readable order number sent as external reference
 * @param amount            total amount to charge in {@code currency}
 * @param currency          ISO-4217 currency code (e.g. {@code ARS})
 * @param customerEmail     payer email forwarded to the provider for receipts
 * @param items             line items forwarded to the provider for the checkout UI
 * @param successUrl        absolute URL to redirect the customer on success
 * @param failureUrl        absolute URL to redirect the customer on failure
 * @param pendingUrl        absolute URL to redirect the customer while payment is pending
 * @param externalReference opaque token sent to the provider for webhook correlation
 * @param idempotencyKey    unique key per attempt; allows the gateway to avoid duplicate preferences
 */
public record CreatePreferenceCommand(
        Long orderId,
        String orderNumber,
        BigDecimal amount,
        String currency,
        String customerEmail,
        List<PreferenceItem> items,
        String successUrl,
        String failureUrl,
        String pendingUrl,
        String notificationUrl,
        String externalReference,
        String idempotencyKey
) {

    /**
     * Single line forwarded to the provider for display in the hosted checkout.
     *
     * @param productId  internal product id, kept for traceability
     * @param title      short title shown in the checkout
     * @param quantity   decimal quantity (catalogs can use grams/units)
     * @param unitPrice  price per unit, must be positive
     */
    public record PreferenceItem(
            Long productId,
            String title,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {
    }
}
