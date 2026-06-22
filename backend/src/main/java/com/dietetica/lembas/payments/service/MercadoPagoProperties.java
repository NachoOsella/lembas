package com.dietetica.lembas.payments.service;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for the Mercado Pago gateway.
 *
 * <p>Bound from the {@code app.mercado-pago.*} prefix and validated on startup.
 * Sensible defaults are provided so the application boots in dev with a fake
 * token, but production deployments must override {@code accessToken} and
 * {@code webhookSecret} via environment variables.</p>
 */
@ConfigurationProperties(prefix = "app.mercado-pago")
@Validated
public record MercadoPagoProperties(

        /** Provider access token. Empty value falls back to the fake gateway. */
        @NotBlank String accessToken,

        /** Shared secret used to verify webhook signatures (HMAC-SHA256). */
        @NotBlank String webhookSecret,

        /** Override for the Mercado Pago REST base URL. Useful for sandbox or mocks. */
        String baseUrl,

        /** URL the provider redirects the customer to on success. */
        @NotBlank String successUrl,

        /** URL the provider redirects the customer to on failure. */
        @NotBlank String failureUrl,

        /** URL the provider redirects the customer to while payment is pending. */
        @NotBlank String pendingUrl,

        /** Public URL the provider will POST webhook notifications to. */
        @NotBlank String notificationUrl,

        /** Maximum time, in milliseconds, to wait for a Mercado Pago HTTP response. */
        @Min(100) long timeoutMs
) {
}
