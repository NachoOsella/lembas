package com.dietetica.lembas.payments.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link FakePaymentGateway}.
 *
 * <p>Covers idempotency, lookup semantics, and the developer-only simulation
 * hooks used by the webhook processor tests.</p>
 */
class FakePaymentGatewayTest {

    private FakePaymentGateway gateway;

    @BeforeEach
    void setUp() {
        gateway = new FakePaymentGateway();
    }

    @Test
    void shouldGeneratePreferenceIdAndInitPointOnFirstCall() {
        CreatePreferenceCommand cmd = sampleCommand("idemp-1");

        PaymentPreferenceResult result = gateway.createPreference(cmd);

        assertThat(result.preferenceId()).startsWith("fake-");
        assertThat(result.initPoint()).contains(result.preferenceId());
        assertThat(result.sandboxInitPoint()).isEqualTo(result.initPoint());
    }

    @Test
    void shouldReturnSamePreferenceIdWhenIdempotencyKeyMatches() {
        CreatePreferenceCommand first = sampleCommand("idemp-2");

        PaymentPreferenceResult firstResult = gateway.createPreference(first);
        PaymentPreferenceResult secondResult = gateway.createPreference(first);

        assertThat(secondResult.preferenceId()).isEqualTo(firstResult.preferenceId());
        assertThat(secondResult.initPoint()).isEqualTo(firstResult.initPoint());
    }

    @Test
    void shouldReturnEmptyWhenLookingUpUnknownPayment() {
        assertThat(gateway.findPayment("does-not-exist")).isEmpty();
    }

    @Test
    void shouldReturnLookupWithSameAmountAsCreatedPreference() {
        CreatePreferenceCommand cmd = sampleCommand("idemp-3");

        PaymentPreferenceResult result = gateway.createPreference(cmd);

        GatewayPaymentLookup lookup = gateway.findPayment(result.preferenceId()).orElseThrow();

        assertThat(lookup.providerPaymentId()).isEqualTo(result.preferenceId());
        assertThat(lookup.amount()).isEqualByComparingTo(cmd.amount());
        assertThat(lookup.status()).isEqualTo("pending");
    }

    @Test
    void shouldUpdateStatusWhenSimulatingApproval() {
        CreatePreferenceCommand cmd = sampleCommand("idemp-4");

        PaymentPreferenceResult result = gateway.createPreference(cmd);
        gateway.simulateApproval(result.preferenceId());

        GatewayPaymentLookup lookup = gateway.findPayment(result.preferenceId()).orElseThrow();
        assertThat(lookup.status()).isEqualTo("approved");
    }

    @Test
    void shouldUpdateStatusWhenSimulatingRejection() {
        CreatePreferenceCommand cmd = sampleCommand("idemp-5");

        PaymentPreferenceResult result = gateway.createPreference(cmd);
        gateway.simulateRejection(result.preferenceId());

        GatewayPaymentLookup lookup = gateway.findPayment(result.preferenceId()).orElseThrow();
        assertThat(lookup.status()).isEqualTo("rejected");
    }

    @Test
    void shouldRejectNullCommand() {
        assertThatThrownBy(() -> gateway.createPreference(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectBlankIdempotencyKey() {
        CreatePreferenceCommand cmd = new CreatePreferenceCommand(
                1L,
                "ON-1",
                new BigDecimal("100.00"),
                "ARS",
                "c@lembas.com",
                List.of(new CreatePreferenceCommand.PreferenceItem(1L, "Test", BigDecimal.ONE, new BigDecimal("100.00"))),
                "https://ok",
                "https://fail",
                "https://pending",
                "ext-1",
                " "
        );

        assertThatThrownBy(() -> gateway.createPreference(cmd))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldReturnEmptyForBlankLookupId() {
        assertThat(gateway.findPayment(" ")).isEmpty();
    }

    private static CreatePreferenceCommand sampleCommand(String idempotencyKey) {
        return new CreatePreferenceCommand(
                42L,
                "ON-20260612-000042",
                new BigDecimal("1500.00"),
                "ARS",
                "customer@lembas.com",
                List.of(new CreatePreferenceCommand.PreferenceItem(7L, "Almendras 1kg", BigDecimal.ONE, new BigDecimal("1500.00"))),
                "https://success",
                "https://failure",
                "https://pending",
                "ON-20260612-000042",
                idempotencyKey
        );
    }
}
