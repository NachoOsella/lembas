package com.dietetica.lembas.payments.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.merchantorder.MerchantOrderClient;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.core.MPRequestOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the official Mercado Pago SDK clients and the {@link
 * com.dietetica.lembas.payments.gateway.PaymentGateway} implementation used by
 * the application.
 *
 * <p>The gateway is the production {@link MercadoPagoGateway} backed by the
 * {@code com.mercadopago:sdk-java} SDK. There is no alternative in-memory
 * implementation: every checkout goes through the real Mercado Pago REST API.</p>
 *
 * <p>This configuration also builds the official SDK clients
 * ({@link PreferenceClient}, {@link PaymentClient},
 * {@link MerchantOrderClient}) as Spring beans and publishes a default
 * {@link MPRequestOptions} with the configured timeouts. Per-request
 * customization (idempotency key, etc.) is layered on top by the gateway.</p>
 */
@Configuration
@EnableConfigurationProperties(MercadoPagoProperties.class)
public class MercadoPagoConfiguration {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoConfiguration.class);

    /** Default Mercado Pago base URL when none is configured. */
    static final String DEFAULT_BASE_URL = "https://api.mercadopago.com";

    /**
     * Validates that the credentials required by the real Mercado Pago
     * gateway are present and seeds the SDK global state.
     *
     * <p>Fail-fast at startup: production misconfigurations do not surface
     * only at the first checkout attempt. The validation runs as an
     * {@link ApplicationRunner} so the existing {@code @ConfigurationProperties}
     * registration of {@link MercadoPagoProperties} is left untouched.</p>
     *
     * <p>Note: the SDK hard-codes its base URL to {@value #DEFAULT_BASE_URL};
     * the {@code app.mercado-pago.base-url} property is validated for symmetry
     * with the previous configuration but currently has no effect on the SDK
     * transport. Custom base URLs (sandbox, mock servers) require implementing
     * a custom {@link com.mercadopago.net.MPHttpClient}, which is out of scope
     * for the current sprint.</p>
     */
    @Bean
    public ApplicationRunner mercadoPagoCredentialsGuard(MercadoPagoProperties properties) {
        return args -> validateAndSeed(properties);
    }

    /**
     * Visible for tests: validates the Mercado Pago credentials and seeds the
     * SDK global state. Throws {@link IllegalStateException} on
     * misconfiguration so the application fails fast at startup.
     */
    static void validateAndSeed(MercadoPagoProperties properties) {
        requireNonBlank(properties.accessToken(), "app.mercado-pago.access-token");
        requireNonBlank(properties.webhookSecret(), "app.mercado-pago.webhook-secret");
        // Seed the SDK global state once at startup. Per-request options
        // (timeouts, custom headers) are layered on top by the gateway.
        MercadoPagoConfig.setAccessToken(properties.accessToken());
        log.info("Mercado Pago gateway enabled");
    }

    /**
     * Default {@link MPRequestOptions} carrying the configured timeouts. The
     * gateway clones this builder and adds per-request headers (idempotency
     * key) on top.
     */
    @Bean
    public MPRequestOptions mercadoPagoRequestOptions(MercadoPagoProperties properties) {
        int timeoutMs = Math.toIntExact(properties.timeoutMs());
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

    private static void requireNonBlank(String value, String propertyName) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    propertyName + " must be set"
            );
        }
    }
}
