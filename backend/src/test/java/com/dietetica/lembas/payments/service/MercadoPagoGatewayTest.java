package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.POST;

/**
 * Unit tests for {@link MercadoPagoGateway} using {@link MockRestServiceServer}.
 *
 * <p>Covers happy paths, 4xx mapping, 5xx retries, and metadata sanitization.</p>
 */
class MercadoPagoGatewayTest {

    private static final String BASE_URL = "https://api.mercadopago.com";

    private MockRestServiceServer mockServer;
    private MercadoPagoGateway gateway;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader("Authorization", "Bearer test-token")
                .defaultHeader("Content-Type", "application/json");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        gateway = new MercadoPagoGateway(builder.build());
    }

    @Test
    void shouldCreatePreferenceAndReturnInitPoint() {
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andExpect(header("X-Idempotency-Key", "idemp-1"))
                .andRespond(withSuccess("""
                        {
                          "id": "PREF-1",
                          "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=PREF-1",
                          "sandbox_init_point": "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=PREF-1"
                        }
                        """, MediaType.APPLICATION_JSON));

        PaymentPreferenceResult result = gateway.createPreference(sampleCommand("idemp-1"));

        assertThat(result.preferenceId()).isEqualTo("PREF-1");
        assertThat(result.initPoint()).contains("PREF-1");
        assertThat(result.sandboxInitPoint()).contains("sandbox");
    }

    @Test
    void shouldMapUnauthorizedToMpUnauthorized() {
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andRespond(withStatus(org.springframework.http.HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-401")))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("credentials");
    }

    @Test
    void shouldMapRejectedToMpPreferenceRejected() {
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andRespond(withStatus(org.springframework.http.HttpStatus.BAD_REQUEST));

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-400")))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRetryOnServerErrorThenReturnLastFailure() {
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andRespond(withServerError());
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andRespond(withServerError());
        mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                .andExpect(method(POST))
                .andRespond(withServerError());

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-500")))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldLookUpPaymentById() {
        mockServer.expect(requestTo(BASE_URL + "/v1/payments/PAY-1"))
                .andExpect(method(GET))
                .andRespond(withSuccess("""
                        {
                          "id": "PAY-1",
                          "status": "approved",
                          "transaction_amount": 1500.00,
                          "currency_id": "ARS",
                          "card": {"first_six_digits": "123456"},
                          "token": "should-be-stripped"
                        }
                        """, MediaType.APPLICATION_JSON));

        Optional<GatewayPaymentLookup> result = gateway.findPayment("PAY-1");

        assertThat(result).isPresent();
        GatewayPaymentLookup lookup = result.get();
        assertThat(lookup.providerPaymentId()).isEqualTo("PAY-1");
        assertThat(lookup.status()).isEqualTo("approved");
        assertThat(lookup.amount()).isEqualByComparingTo("1500.00");
        assertThat(lookup.currency()).isEqualTo("ARS");
        // Sanitized metadata must drop card + token fields.
        assertThat(lookup.rawMetadata()).doesNotContainKey("card");
        assertThat(lookup.rawMetadata()).doesNotContainKey("token");
    }

    @Test
    void shouldReturnEmptyWhenLookingUpBlankPaymentId() {
        assertThat(gateway.findPayment("")).isEmpty();
        assertThat(gateway.findPayment(null)).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenProviderReturnsEmptyBody() {
        mockServer.expect(requestTo(BASE_URL + "/v1/payments/PAY-X"))
                .andExpect(method(GET))
                .andRespond(withSuccess("", MediaType.APPLICATION_JSON));

        Optional<GatewayPaymentLookup> result = gateway.findPayment("PAY-X");

        assertThat(result).isEmpty();
    }

    @Test
    void shouldMapConnectExceptionToMpUnreachable() {
        // First call raises I/O; subsequent retries also fail.
        for (int i = 0; i < 3; i++) {
            mockServer.expect(requestTo(BASE_URL + "/checkout/preferences"))
                    .andExpect(method(POST))
                    .andRespond(withException(new java.io.IOException("connection refused")));
        }

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-net")))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not reachable");
    }

    @Test
    void shouldRejectNullCommand() {
        assertThatThrownBy(() -> gateway.createPreference(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectZeroAmount() {
        CreatePreferenceCommand cmd = new CreatePreferenceCommand(
                1L, "ON-1", BigDecimal.ZERO, "ARS", "c@lembas.com",
                List.of(), "https://ok", "https://fail", "https://pending", "https://notify", "ext-1", "idemp-0");

        assertThatThrownBy(() -> gateway.createPreference(cmd))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectBlankIdempotencyKey() {
        CreatePreferenceCommand cmd = new CreatePreferenceCommand(
                1L, "ON-1", new BigDecimal("100.00"), "ARS", "c@lembas.com",
                List.of(), "https://ok", "https://fail", "https://pending", "https://notify", "ext-1", " ");

        assertThatThrownBy(() -> gateway.createPreference(cmd))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CreatePreferenceCommand sampleCommand(String idempotencyKey) {
        return new CreatePreferenceCommand(
                42L,
                "ON-20260612-000042",
                new BigDecimal("1500.00"),
                "ARS",
                "customer@lembas.com",
                List.of(new CreatePreferenceCommand.PreferenceItem(
                        7L,
                        "Almendras 1kg",
                        BigDecimal.ONE,
                        new BigDecimal("1500.00")
                )),
                "https://success",
                "https://failure",
                "https://pending",
                "https://notify",
                "ON-20260612-000042",
                idempotencyKey
        );
    }
}
