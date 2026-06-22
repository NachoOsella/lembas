package com.dietetica.lembas.payments.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Wires the {@link PaymentGateway} implementation used by the application.
 *
 * <p>The active implementation is driven by the {@code app.payments.gateway}
 * property: {@code fake} selects {@link FakePaymentGateway} (default for dev and
 * test), {@code mercadopago} selects {@link MercadoPagoGateway}. This keeps the
 * rest of the application decoupled from any specific provider and makes the
 * checkout flow fully exercisable without external services.</p>
 */
@Configuration
@EnableConfigurationProperties(MercadoPagoProperties.class)
public class MercadoPagoConfiguration {

    /** Property key selecting the active gateway implementation. */
    public static final String GATEWAY_PROPERTY = "app.payments.gateway";

    /** Bean name for the fake (in-memory) gateway used by tests and dev. */
    public static final String FAKE_GATEWAY = "fakePaymentGateway";

    /** Default Mercado Pago base URL when none is configured. */
    static final String DEFAULT_BASE_URL = "https://api.mercadopago.com";

    /**
     * Returns the gateway bean. The default bean (when no qualifier is requested)
     * is the fake one so the application boots cleanly without external
     * credentials; the Mercado Pago gateway is exposed under its own bean name
     * and becomes the @Primary one when {@code app.payments.gateway=mercadopago}.
     */
    @Bean
    public RestClient mercadoPagoRestClient(MercadoPagoProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) properties.timeoutMs());
        factory.setReadTimeout((int) properties.timeoutMs());
        String baseUrl = properties.baseUrl() == null || properties.baseUrl().isBlank()
                ? DEFAULT_BASE_URL
                : properties.baseUrl();
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent", "Lembas/1.0 (Checkout Pro)")
                .requestFactory(factory);
        // Only attach a bearer token when one is configured; the fake gateway
        // does not use the rest client and several test profiles leave the
        // property blank on purpose.
        if (properties.accessToken() != null && !properties.accessToken().isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + properties.accessToken());
        }
        return builder.build();
    }

    /** Returns the configured gateway mode, defaulting to {@code fake} for safety. */
    @Bean
    public GatewayMode gatewayMode(@Value("${" + GATEWAY_PROPERTY + ":fake}") String mode) {
        return GatewayMode.from(mode);
    }

    /**
     * Validates that the credentials required by the real Mercado Pago gateway
     * are present whenever {@code app.payments.gateway=mercadopago} is set.
     * Fails fast at bean construction so production misconfigurations do not
     * surface only at the first checkout attempt.
     */
    @Bean
    public MercadoPagoCredentialsGuard mercadoPagoCredentialsGuard(
            MercadoPagoProperties properties, GatewayMode mode) {
        if (mode == GatewayMode.MERCADO_PAGO) {
            if (properties.accessToken() == null || properties.accessToken().isBlank()) {
                throw new IllegalStateException(
                        "app.mercado-pago.access-token must be set when app.payments.gateway=mercadopago");
            }
            if (properties.webhookSecret() == null || properties.webhookSecret().isBlank()) {
                throw new IllegalStateException(
                        "app.mercado-pago.webhook-secret must be set when app.payments.gateway=mercadopago");
            }
        }
        return new MercadoPagoCredentialsGuard();
    }

    /** Marker bean returned when the Mercado Pago credentials check passes. */
    public static final class MercadoPagoCredentialsGuard {
    }

    /** Available gateway implementations. */
    public enum GatewayMode {
        /** In-memory gateway used for development and tests. */
        FAKE,
        /** Real Mercado Pago HTTP client. */
        MERCADO_PAGO;

        static GatewayMode from(String value) {
            if (value == null || value.isBlank() || "fake".equalsIgnoreCase(value)) {
                return FAKE;
            }
            if ("mercadopago".equalsIgnoreCase(value)) {
                return MERCADO_PAGO;
            }
            throw new IllegalArgumentException("Unsupported payments.gateway value: " + value);
        }
    }
}
