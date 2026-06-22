package com.dietetica.lembas.payments.service;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration properties for the Mercado Pago gateway.
 *
 * <p>Bound from the {@code app.mercado-pago.*} prefix and validated on startup.
 * The {@code accessToken} and {@code webhookSecret} are intentionally not
 * {@code @NotBlank}: the application boots with the in-memory
 * {@code FakePaymentGateway} when they are empty, which is the expected
 * behaviour for local development and the default {@code dev}/{@code test}
 * profiles. Production deployments that switch to the real Mercado Pago
 * gateway must override both values via environment variables; the
 * {@link MercadoPagoConfiguration} performs a runtime check at bean
 * construction time so misconfigurations fail fast.</p>
 */
@ConfigurationProperties(prefix = "app.mercado-pago")
@Validated
public record MercadoPagoProperties(

        /** Provider access token. Empty value is allowed; the real gateway validates at startup. */
        String accessToken,

        /** Shared secret used to verify webhook signatures (HMAC-SHA256). Empty value is allowed. */
        String webhookSecret,

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
