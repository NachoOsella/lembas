package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Verifies the {@code x-signature} header sent by Mercado Pago with each
 * webhook notification.
 *
 * <p>The header is a comma-separated list of {@code key=value} pairs; the
 * relevant ones are {@code ts} (timestamp) and {@code v1} (HMAC-SHA256
 * digest). The manifest template, per the official Mercado Pago documentation,
 * is:</p>
 *
 * <pre>{@code
 * id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
 * }</pre>
 *
 * <p>Key rules implemented here:</p>
 * <ul>
 *   <li>The separator is a semicolon ({@code ;}), not an ampersand.</li>
 *   <li>Each pair uses a colon ({@code :}) between key and value.</li>
 *   <li>The key of the request id is {@code request-id} (hyphen, not
 *       underscore).</li>
 *   <li>The manifest ends with a trailing {@code ;}.</li>
 *   <li>When {@code data.id} or {@code x-request-id} is absent, that pair is
 *       removed from the manifest entirely (not rendered as an empty value).</li>
 *   <li>The {@code data.id} value is lowercased before being included, as
 *       required for order ids containing uppercase alphanumeric characters.</li>
 * </ul>
 *
 * <p>The computed digest is compared against {@code v1} in constant time.
 * A missing or unparseable signature raises {@code WEBHOOK_SIGNATURE_INVALID}
 * (401).</p>
 */
@Component
public class WebhookSignatureValidator {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final MercadoPagoProperties properties;

    public WebhookSignatureValidator(MercadoPagoProperties properties) {
        this.properties = properties;
    }

    /**
     * Validates the supplied signature against the configured webhook secret.
     *
     * @param xSignature the raw value of the {@code x-signature} header
     * @param xRequestId the raw value of the {@code x-request-id} header (may be null/blank)
     * @param dataId     the {@code data.id} query parameter value (may be null/blank)
     * @throws DomainException when the signature cannot be verified
     */
    public void validate(String xSignature, String xRequestId, String dataId) {
        if (xSignature == null || xSignature.isBlank()) {
            throw new DomainException("WEBHOOK_SIGNATURE_INVALID", HttpStatus.UNAUTHORIZED,
                    "Missing webhook signature");
        }
        String ts = extractPart(xSignature, "ts");
        String v1 = extractPart(xSignature, "v1");
        if (ts == null || v1 == null) {
            throw new DomainException("WEBHOOK_SIGNATURE_INVALID", HttpStatus.UNAUTHORIZED,
                    "Webhook signature is missing ts or v1 components");
        }
        String manifest = buildManifest(dataId, xRequestId, ts);
        String expected = hmacSha256(properties.webhookSecret(), manifest);
        if (!constantTimeEquals(expected, v1)) {
            throw new DomainException("WEBHOOK_SIGNATURE_INVALID", HttpStatus.UNAUTHORIZED,
                    "Webhook signature does not match");
        }
    }

    /**
     * Builds the manifest per the official MP template.
     *
     * <p>{@code id:} is omitted when {@code dataId} is blank, {@code request-id:}
     * is omitted when {@code xRequestId} is blank, and {@code ts:} is always
     * present. The {@code dataId} is lowercased as required by the docs. Each
     * pair is separated and terminated by a semicolon.</p>
     */
    private static String buildManifest(String dataId, String xRequestId, String ts) {
        StringBuilder manifest = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            manifest.append("id:").append(dataId.toLowerCase()).append(';');
        }
        if (xRequestId != null && !xRequestId.isBlank()) {
            manifest.append("request-id:").append(xRequestId).append(';');
        }
        manifest.append("ts:").append(ts).append(';');
        return manifest.toString();
    }

    /** Extracts a single key=value pair from a comma-separated signature string. */
    private String extractPart(String signature, String key) {
        for (String part : signature.split(",")) {
            String trimmed = part.trim();
            int eq = trimmed.indexOf('=');
            if (eq > 0 && trimmed.substring(0, eq).equals(key)) {
                return trimmed.substring(eq + 1);
            }
        }
        return null;
    }

    /** Returns the lowercase hex HMAC-SHA256 digest of the supplied manifest. */
    private static String hmacSha256(String secret, String manifest) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] digest = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256", ex);
        }
    }

    /** Compares two hex digests in constant time to avoid timing attacks. */
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }
}