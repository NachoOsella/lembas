package com.dietetica.lembas.payments.service;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Provider-reported payment state surfaced to the application layer.
 *
 * <p>The {@code rawMetadata} map carries the sanitized subset of provider fields
 * that the application considers safe to persist for audit and debugging. The
 * gateway strips sensitive fields such as card data, raw PII, and access tokens
 * before populating this record.</p>
 *
 * @param providerPaymentId the provider-side payment id
 * @param status            the raw provider status (e.g. {@code approved}, {@code rejected})
 * @param amount            the amount the provider reports as authorised
 * @param currency          the ISO-4217 currency reported by the provider
 * @param rawMetadata       sanitized metadata safe to persist
 */
public record GatewayPaymentLookup(
        String providerPaymentId,
        String status,
        BigDecimal amount,
        String currency,
        Map<String, Object> rawMetadata
) {
}
