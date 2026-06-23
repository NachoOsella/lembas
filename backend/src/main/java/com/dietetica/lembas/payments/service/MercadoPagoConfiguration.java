package com.dietetica.lembas.payments.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.merchantorder.MerchantOrderClient;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.core.MPRequestOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the {@link PaymentGateway} implementation used by the application.
 *
 * <p>The active implementation is driven by the {@code app.payments.gateway}
 * property: {@code fake} selects {@link FakePaymentGateway} (default for dev and
 * test), {@code mercadopago} selects {@link MercadoPagoGateway}. This keeps the
 * rest of the application decoupled from any specific provider and makes the
 * checkout flow fully exercisable without external services.</p>
 *
 * <p>When the real Mercado Pago gateway is selected, this configuration builds
 * the official SDK clients ({@link PreferenceClient}, {@link PaymentClient},
 * {@link MerchantOrderClient}) as Spring beans and publishes a default
 * {@link MPRequestOptions} with the configured timeouts. Per-request
 * customization (idempotency key, etc.) is layered on top by the gateway.</p>
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
     * Returns the gateway mode, defaulting to {@code fake} for safety. The actual
     * gateway bean selection is driven by the {@code @ConditionalOnProperty}
     * annotations on {@link FakePaymentGateway} and {@link MercadoPagoGateway}.
     */
    @Bean
    public GatewayMode gatewayMode(@Value("${" + GATEWAY_PROPERTY + ":fake}") String mode) {
        return GatewayMode.from(mode);
    }

    /**
     * Validates that the credentials required by the real Mercado Pago gateway
     * are present whenever {@code app.payments.gateway=mercadopago} is set and
     * seeds the SDK global config with the access token. Fails fast at bean
     * construction so production misconfigurations do not surface only at the
     * first checkout attempt.
     *
     * <p>Note: the SDK hard-codes its base URL to {@value #DEFAULT_BASE_URL};
     * the {@code app.mercado-pago.base-url} property is validated for symmetry
     * with the previous configuration but currently has no effect on the SDK
     * transport. Custom base URLs (sandbox, mock servers) require implementing
     * a custom {@link com.mercadopago.net.MPHttpClient}, which is out of scope
     * for the current sprint.</p>
     */
    @Bean
    public MercadoPagoCredentialsGuard mercadoPagoCredentialsGuard(
            MercadoPagoProperties properties, GatewayMode mode
    ) {
        if (mode == GatewayMode.MERCADO_PAGO) {
            if (properties.accessToken() == null || properties.accessToken().isBlank()) {
                throw new IllegalStateException(
                        "app.mercado-pago.access-token must be set when app.payments.gateway=mercadopago");
            }
            if (properties.webhookSecret() == null || properties.webhookSecret().isBlank()) {
                throw new IllegalStateException(
                        "app.mercado-pago.webhook-secret must be set when app.payments.gateway=mercadopago");
            }
            // Seed the SDK global state once at startup. Per-request options
            // (timeouts, custom headers) are layered on top by the gateway.
            MercadoPagoConfig.setAccessToken(properties.accessToken());
        }
        return new MercadoPagoCredentialsGuard();
    }

    /**
     * Default {@link MPRequestOptions} carrying the configured timeouts. The
     * gateway clones this builder and adds per-request headers (idempotency
     * key) on top.
     */
    @Bean
    public MPRequestOptions mercadoPagoRequestOptions(MercadoPagoProperties properties) {
        int timeoutMs = (int) Math.max(100L, properties.timeoutMs());
        return MPRequestOptions.builder()
                .connectionTimeout(timeoutMs)
                .connectionRequestTimeout(timeoutMs)
                .socketTimeout(timeoutMs)
                .build();
    }

    /** Official SDK client used to create Checkout Pro preferences. */
    @Bean
    public PreferenceClient preferenceClient() {
        return new PreferenceClient();
    }

    /** Official SDK client used to look up individual payments. */
    @Bean
    public PaymentClient paymentClient() {
        return new PaymentClient();
    }

    /** Official SDK client used to look up merchant orders (Checkout Pro wrapper). */
    @Bean
    public MerchantOrderClient merchantOrderClient() {
        return new MerchantOrderClient();
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
