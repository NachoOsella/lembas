package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link WebhookSignatureValidator}.
 *
 * <p>Covers the documented MP signature scheme: ts/v1 extraction, manifest
 * shape, constant-time comparison, and rejection of missing/tampered parts.</p>
 */
class WebhookSignatureValidatorTest {

    private static final String SECRET = "test-secret";

    private final WebhookSignatureValidator validator = new WebhookSignatureValidator(
            new MercadoPagoProperties(
                    "token",
                    SECRET,
                    "https://api.mercadopago.com",
                    "https://ok",
                    "https://fail",
                    "https://pending",
                    "https://notify",
                    5000L
            )
    );

    @Test
    void shouldAcceptValidSignature() {
        String ts = "1700000000";
        String dataId = "12345";
        String requestId = "abc";
        String v1 = hmac(SECRET, "id=" + dataId + "&request_id=" + requestId + "&ts=" + ts);
        String signature = "ts=" + ts + ",v1=" + v1;

        assertThatCode(() -> validator.validate(signature, requestId, dataId))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldRejectMissingSignature() {
        assertThatThrownBy(() -> validator.validate(null, "req", "1"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Missing");
    }

    @Test
    void shouldRejectBlankSignature() {
        assertThatThrownBy(() -> validator.validate("  ", "req", "1"))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectSignatureMissingV1Component() {
        assertThatThrownBy(() -> validator.validate("ts=1700000000", "req", "1"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("ts or v1");
    }

    @Test
    void shouldRejectSignatureMissingTsComponent() {
        assertThatThrownBy(() -> validator.validate("v1=deadbeef", "req", "1"))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("ts or v1");
    }

    @Test
    void shouldRejectTamperedSignature() {
        String ts = "1700000000";
        String dataId = "12345";
        String requestId = "abc";
        String wrong = hmac(SECRET, "id=" + dataId + "&request_id=" + requestId + "&ts=9999999999");
        String signature = "ts=" + ts + ",v1=" + wrong;

        assertThatThrownBy(() -> validator.validate(signature, requestId, dataId))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void shouldRejectSignatureFromDifferentSecret() {
        String ts = "1700000000";
        String dataId = "12345";
        String requestId = "abc";
        String wrong = hmac("other-secret", "id=" + dataId + "&request_id=" + requestId + "&ts=" + ts);
        String signature = "ts=" + ts + ",v1=" + wrong;

        assertThatThrownBy(() -> validator.validate(signature, requestId, dataId))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldAcceptSignatureWithExtraParts() {
        String ts = "1700000000";
        String dataId = "12345";
        String requestId = "abc";
        String v1 = hmac(SECRET, "id=" + dataId + "&request_id=" + requestId + "&ts=" + ts);
        // Real MP sometimes appends v0 etc. The validator should ignore them.
        String signature = "v0=ignored,ts=" + ts + ",v1=" + v1 + ",v2=more";

        assertThatCode(() -> validator.validate(signature, requestId, dataId))
                .doesNotThrowAnyException();
    }

    private static String hmac(String secret, String manifest) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
