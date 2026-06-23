package com.dietetica.lembas.payments;

/**
 * Canonical machine-readable error codes for the payments module.
 *
 * <p>Centralised here so the gateway, services, and controller can refer to
 * the same constants instead of duplicating magic strings across files. The
 * global {@code @ControllerAdvice} surfaces these codes verbatim in
 * {@code ApiError.code} responses, so renames are API-breaking.</p>
 */
public final class PaymentErrorCodes {

    /** Mercado Pago returned a 4xx (other than 401/403/404) for a preference request. */
    public static final String MP_PREFERENCE_REJECTED = "MP_PREFERENCE_REJECTED";

    /** Mercado Pago rejected the configured credentials (401/403). */
    public static final String MP_UNAUTHORIZED = "MP_UNAUTHORIZED";

    /** Mercado Pago returned 404 for a resource lookup (payment or merchant order). */
    public static final String MP_NOT_FOUND = "MP_NOT_FOUND";

    /** Mercado Pago returned a 5xx or network failure. */
    public static final String MP_UPSTREAM_ERROR = "MP_UPSTREAM_ERROR";

    /** Mercado Pago SDK raised a non-API error (network, IO, parsing). */
    public static final String MP_UNREACHABLE = "MP_UNREACHABLE";

    /** Preference command has a non-positive amount. */
    public static final String MP_INVALID_AMOUNT = "MP_INVALID_AMOUNT";

    /** Mercado Pago returned a response missing the expected field. */
    public static final String MP_INVALID_RESPONSE = "MP_INVALID_RESPONSE";

    /** Webhook signature did not match the configured secret. */
    public static final String WEBHOOK_SIGNATURE_INVALID = "WEBHOOK_SIGNATURE_INVALID";

    /** Order not found or does not belong to the authenticated customer. */
    public static final String ORDER_NOT_FOUND = "ORDER_NOT_FOUND";

    /** The order is not in a state that accepts a Mercado Pago payment. */
    public static final String ORDER_NOT_PAYABLE = "ORDER_NOT_PAYABLE";

    /** No local payment matched the provider webhook notification. */
    public static final String PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND";

    /** Authenticated user lacks the required role for the operation. */
    public static final String ACCESS_DENIED = "ACCESS_DENIED";

    private PaymentErrorCodes() {
    }
}
