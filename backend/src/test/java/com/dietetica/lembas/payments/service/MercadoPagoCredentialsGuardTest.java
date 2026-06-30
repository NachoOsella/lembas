package com.dietetica.lembas.payments.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the credentials guard that fails fast when the Mercado Pago
 * gateway is started without {@code accessToken} and {@code webhookSecret}.
 */
class MercadoPagoCredentialsGuardTest {

    @Test
    void shouldPassWhenCredentialsArePresent() {
        MercadoPagoProperties properties = properties("test-token", "test-secret");

        assertThatCode(() -> MercadoPagoConfiguration.validateAndSeed(properties))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldFailWhenAccessTokenIsMissing() {
        MercadoPagoProperties properties = properties(null, "test-secret");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("access-token");
    }

    @Test
    void shouldFailWhenAccessTokenIsBlank() {
        MercadoPagoProperties properties = properties("   ", "test-secret");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("access-token");
    }

    @Test
    void shouldFailWhenWebhookSecretIsMissing() {
        MercadoPagoProperties properties = properties("test-token", null);

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("webhook-secret");
    }

    @Test
    void shouldFailWhenWebhookSecretIsBlank() {
        MercadoPagoProperties properties = properties("test-token", "");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("webhook-secret");
    }

    private static MercadoPagoProperties properties(String accessToken, String webhookSecret) {
        return new MercadoPagoProperties(
                accessToken,
                webhookSecret,
                "https://api.mercadopago.com",
                "https://ok",
                "https://fail",
                "https://pending",
                "https://notify",
                5000L);
    }
}
