package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.shared.exception.DomainException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercadopago.client.merchantorder.MerchantOrderClient;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.net.MPResponse;
import com.mercadopago.resources.merchantorder.MerchantOrder;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link MercadoPagoGateway} using mocked SDK clients.
 *
 * <p>The gateway is exercised by stubbing {@link PreferenceClient},
 * {@link PaymentClient}, and {@link MerchantOrderClient} with Mockito. SDK
 * resources ({@link Preference}, {@link Payment}, {@link MerchantOrder}) are
 * populated from JSON snippets via Jackson because the SDK does not expose
 * setters on them. SDK failures are simulated by throwing
 * {@link MPApiException} instances built with a real {@link MPResponse} so
 * {@code getStatusCode()} returns the intended value.</p>
 */
class MercadoPagoGatewayTest {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .setPropertyNamingStrategy(com.fasterxml.jackson.databind.PropertyNamingStrategies.SNAKE_CASE)
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private PreferenceClient preferenceClient;
    private PaymentClient paymentClient;
    private MerchantOrderClient merchantOrderClient;
    private MercadoPagoGateway gateway;

    @BeforeEach
    void setUp() {
        preferenceClient = mock(PreferenceClient.class);
        paymentClient = mock(PaymentClient.class);
        merchantOrderClient = mock(MerchantOrderClient.class);
        MPRequestOptions options = MPRequestOptions.builder()
                .connectionTimeout(2000)
                .connectionRequestTimeout(2000)
                .socketTimeout(2000)
                .build();
        gateway = new MercadoPagoGateway(
                preferenceClient, paymentClient, merchantOrderClient, options);
    }

    // ------------------------------------------------------------------
    // createPreference
    // ------------------------------------------------------------------

    @Test
    void shouldCreatePreferenceAndReturnInitPoint() throws Exception {
        Preference pref = preference("""
                {
                  "id": "PREF-1",
                  "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=PREF-1",
                  "sandbox_init_point": "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=PREF-1"
                }
                """);
        when(preferenceClient.create(any(), any())).thenReturn(pref);

        PaymentPreferenceResult result = gateway.createPreference(sampleCommand("idemp-1"));

        assertThat(result.preferenceId()).isEqualTo("PREF-1");
        assertThat(result.initPoint()).contains("PREF-1");
        assertThat(result.sandboxInitPoint()).contains("sandbox");
        verify(preferenceClient).create(any(), any());
    }

    @Test
    void shouldNotSetNotificationUrlOnPreferenceRequest() throws Exception {
        // MP panel-level Webhook URL is the source of truth for the notification
        // target; preference-level notification URLs use a different internal
        // signing system that is incompatible with the panel's webhook secret.
        Preference pref = preference("""
                {
                  "id": "PREF-QUERY",
                  "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=PREF-QUERY"
                }
                """);
        when(preferenceClient.create(any(), any())).thenReturn(pref);

        gateway.createPreference(sampleCommand(
                "idemp-query", "https://notify/mercadopago?tenant=lembas"));

        org.mockito.ArgumentCaptor<com.mercadopago.client.preference.PreferenceRequest> captor =
                org.mockito.ArgumentCaptor.forClass(
                        com.mercadopago.client.preference.PreferenceRequest.class);
        verify(preferenceClient).create(captor.capture(), any());
        assertThat(captor.getValue().getNotificationUrl()).isNull();
    }

    @Test
    void shouldMapUnauthorizedToMpUnauthorized() throws Exception {
        when(preferenceClient.create(any(), any()))
                .thenThrow(apiException(401, "{\"message\":\"unauthorized\"}"));

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-401")))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("credentials");
    }

    @Test
    void shouldMapRejectedToMpPreferenceRejected() throws Exception {
        when(preferenceClient.create(any(), any()))
                .thenThrow(apiException(400, "{\"message\":\"bad request\"}"));

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-400")))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRetryOnServerErrorThenReturnLastFailure() throws Exception {
        when(preferenceClient.create(any(), any()))
                .thenThrow(apiException(500, "{\"message\":\"upstream\"}"));

        assertThatThrownBy(() -> gateway.createPreference(sampleCommand("idemp-500")))
                .isInstanceOf(DomainException.class);
        // 1 initial attempt + 2 retries = 3 total (MAX_RETRIES).
        verify(preferenceClient, times(3)).create(any(), any());
    }

    @Test
    void shouldSendIdempotencyKeyAsRequestHeader() throws Exception {
        Preference pref = preference("""
                {
                  "id": "PREF-IDEMP",
                  "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=PREF-IDEMP"
                }
                """);
        when(preferenceClient.create(any(), any())).thenReturn(pref);

        gateway.createPreference(sampleCommand("idemp-key-123"));

        org.mockito.ArgumentCaptor<MPRequestOptions> captor =
                org.mockito.ArgumentCaptor.forClass(MPRequestOptions.class);
        verify(preferenceClient).create(any(), captor.capture());
        assertThat(captor.getValue().getCustomHeaders())
                .containsEntry("X-Idempotency-Key", "idemp-key-123");
    }

    // ------------------------------------------------------------------
    // findPayment
    // ------------------------------------------------------------------

    @Test
    void shouldLookUpPaymentById() throws Exception {
        Payment payment = payment("""
                {
                  "id": 900,
                  "status": "approved",
                  "transaction_amount": 1500.00,
                  "currency_id": "ARS",
                  "external_reference": "order-42"
                }
                """);
        when(paymentClient.get(anyLong(), any())).thenReturn(payment);

        Optional<GatewayPaymentLookup> result = gateway.findPayment("900");

        assertThat(result).isPresent();
        GatewayPaymentLookup lookup = result.get();
        assertThat(lookup.providerPaymentId()).isEqualTo("900");
        assertThat(lookup.status()).isEqualTo("approved");
        assertThat(lookup.amount()).isEqualByComparingTo("1500.00");
        assertThat(lookup.currency()).isEqualTo("ARS");
        // The metadata is intentionally limited to the fields the webhook
        // processor needs (external_reference + currency) to avoid leaking
        // card data, tokens, or other sensitive provider fields.
        assertThat(lookup.rawMetadata()).containsEntry("external_reference", "order-42");
        assertThat(lookup.rawMetadata()).containsEntry("currency", "ARS");
    }

    @Test
    void shouldReturnEmptyWhenLookingUpBlankPaymentId() {
        assertThat(gateway.findPayment("")).isEmpty();
        assertThat(gateway.findPayment(null)).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenPaymentIdIsNotNumeric() {
        assertThat(gateway.findPayment("not-a-number")).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenProviderReturns404() throws Exception {
        when(paymentClient.get(anyLong(), any()))
                .thenThrow(apiException(404, "{\"message\":\"not found\"}"));

        assertThat(gateway.findPayment("999")).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenProviderReturnsNullBody() throws Exception {
        when(paymentClient.get(anyLong(), any())).thenReturn(null);

        assertThat(gateway.findPayment("999")).isEmpty();
    }

    @Test
    void shouldNotLeakCardOrTokenFieldsIntoMetadata() throws Exception {
        // findPayment only projects external_reference + currency_id from the
        // SDK resource, so even if the SDK Payment object internally holds
        // card/token/secret fields, the returned metadata never sees them.
        Payment payment = payment("""
                {
                  "id": 800,
                  "status": "approved",
                  "transaction_amount": 100.00,
                  "currency_id": "ARS",
                  "external_reference": "order-77"
                }
                """);
        when(paymentClient.get(anyLong(), any())).thenReturn(payment);

        Optional<GatewayPaymentLookup> result = gateway.findPayment("800");

        assertThat(result).isPresent();
        Map<String, Object> meta = result.get().rawMetadata();
        assertThat(meta.keySet()).noneMatch(k -> k.toLowerCase().contains("card"));
        assertThat(meta.keySet()).noneMatch(k -> k.toLowerCase().contains("token"));
        assertThat(meta.keySet()).noneMatch(k -> k.toLowerCase().contains("secret"));
        assertThat(meta).containsKey("external_reference");
        assertThat(meta).containsKey("currency");
    }

    // ------------------------------------------------------------------
    // findPaymentByMerchantOrderId
    // ------------------------------------------------------------------

    @Test
    void shouldFindPaymentByMerchantOrderId() throws Exception {
        MerchantOrder merchantOrder = merchantOrder("""
                {
                  "id": 420,
                  "payments": [
                    { "id": 700 }
                  ]
                }
                """);
        when(merchantOrderClient.get(anyLong(), any())).thenReturn(merchantOrder);

        Payment payment = payment("""
                {
                  "id": 700,
                  "status": "approved",
                  "transaction_amount": 500.00,
                  "currency_id": "ARS"
                }
                """);
        when(paymentClient.get(anyLong(), any())).thenReturn(payment);

        Optional<GatewayPaymentLookup> result = gateway.findPaymentByMerchantOrderId("420");

        assertThat(result).isPresent();
        assertThat(result.get().providerPaymentId()).isEqualTo("700");
    }

    @Test
    void shouldReturnEmptyWhenMerchantOrderHasNoPayments() throws Exception {
        MerchantOrder merchantOrder = merchantOrder("""
                {
                  "id": 421,
                  "payments": []
                }
                """);
        when(merchantOrderClient.get(anyLong(), any())).thenReturn(merchantOrder);

        assertThat(gateway.findPaymentByMerchantOrderId("421")).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenMerchantOrderIdIsBlank() {
        assertThat(gateway.findPaymentByMerchantOrderId(null)).isEmpty();
        assertThat(gateway.findPaymentByMerchantOrderId("")).isEmpty();
        assertThat(gateway.findPaymentByMerchantOrderId("not-a-number")).isEmpty();
    }

    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** Builds an SDK {@link MPApiException} with a real response and status code. */
    private static MPApiException apiException(int status, String body) {
        MPResponse response = new MPResponse(status, Map.of(), body);
        return new MPApiException("HTTP " + status, response);
    }

    /** Populates an SDK {@link Preference} resource from a JSON snippet. */
    private static Preference preference(String json) throws Exception {
        return MAPPER.readValue(json, Preference.class);
    }

    /** Populates an SDK {@link Payment} resource from a JSON snippet. */
    private static Payment payment(String json) throws Exception {
        return MAPPER.readValue(json, Payment.class);
    }

    /** Populates an SDK {@link MerchantOrder} resource from a JSON snippet. */
    private static MerchantOrder merchantOrder(String json) throws Exception {
        return MAPPER.readValue(json, MerchantOrder.class);
    }

    private static CreatePreferenceCommand sampleCommand(String idempotencyKey) {
        return sampleCommand(idempotencyKey, "https://notify");
    }

    private static CreatePreferenceCommand sampleCommand(String idempotencyKey, String notificationUrl) {
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
                notificationUrl,
                "ON-20260612-000042",
                idempotencyKey
        );
    }
}
