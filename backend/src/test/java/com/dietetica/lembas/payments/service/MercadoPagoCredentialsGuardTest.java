package com.dietetica.lembas.payments.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for the credentials guard that fails fast when the real Mercado
 * Pago gateway is selected without {@code accessToken} and {@code webhookSecret}.
 */
class MercadoPagoCredentialsGuardTest {

    @Test
    void shouldPassWhenFakeGatewayIsSelectedRegardlessOfCredentials() {
        MercadoPagoProperties properties = properties(null, null);

        assertThatCode(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.FAKE))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldPassWhenMercadoPagoGatewayIsSelectedWithFullCredentials() {
        MercadoPagoProperties properties = properties("test-token", "test-secret");

        assertThatCode(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.MERCADO_PAGO))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldFailWhenMercadoPagoGatewayIsSelectedWithoutAccessToken() {
        MercadoPagoProperties properties = properties(null, "test-secret");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.MERCADO_PAGO))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("access-token");
    }

    @Test
    void shouldFailWhenMercadoPagoGatewayIsSelectedWithBlankAccessToken() {
        MercadoPagoProperties properties = properties("   ", "test-secret");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.MERCADO_PAGO))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("access-token");
    }

    @Test
    void shouldFailWhenMercadoPagoGatewayIsSelectedWithoutWebhookSecret() {
        MercadoPagoProperties properties = properties("test-token", null);

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.MERCADO_PAGO))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("webhook-secret");
    }

    @Test
    void shouldFailWhenMercadoPagoGatewayIsSelectedWithBlankWebhookSecret() {
        MercadoPagoProperties properties = properties("test-token", "");

        assertThatThrownBy(() -> MercadoPagoConfiguration.validateAndSeed(properties, GatewayMode.MERCADO_PAGO))
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
