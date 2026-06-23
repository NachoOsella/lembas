package com.dietetica.lembas.payments.web;

import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.service.MercadoPagoWebhookProcessor;
import com.dietetica.lembas.payments.service.WebhookSignatureValidator;
import com.dietetica.lembas.shared.exception.DomainException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public inbound endpoint for Mercado Pago webhook notifications.
 *
 * <p>The endpoint is exposed under {@code /api/webhooks/**} which is allow-listed
 * in {@code SecurityConfig} so no authentication is required. Every request is
 * signature-verified; the processor is idempotent and always returns 200 OK
 * once the signature is accepted (so Mercado Pago does not retry on transient
 * application errors). Legacy IPN requests are accepted only in the
 * {@code ?id=...&topic=payment} shape because Mercado Pago documents that IPN
 * signatures cannot be validated with the Webhooks secret; those requests are
 * still reconciled against the provider API before any local state changes.
 * Invalid Webhook signatures return 401.</p>
 */
@RestController
@RequestMapping("/api/webhooks/mercadopago")
public class MercadoPagoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookController.class);

    private final WebhookSignatureValidator signatureValidator;
    private final MercadoPagoWebhookProcessor processor;

    public MercadoPagoWebhookController(
            WebhookSignatureValidator signatureValidator,
            MercadoPagoWebhookProcessor processor
    ) {
        this.signatureValidator = signatureValidator;
        this.processor = processor;
    }

    /**
     * Receives and processes a Mercado Pago notification. Always returns 200
     * with {@code {"received":true}} once the signature passes verification;
     * 401 is returned for invalid signatures.
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> receive(
            jakarta.servlet.http.HttpServletRequest httpRequest,
            @RequestHeader(name = "x-signature", required = false) String xSignature,
            @RequestHeader(name = "x-request-id", required = false) String xRequestId,
            // MP Webhooks send the relevant id as the `data.id` URL query parameter,
            // NOT in the JSON body. Per the official signature spec, the `id:` pair
            // in the manifest must use this query value (lowercased by the validator).
            @RequestParam(name = "data.id", required = false) String dataId,
            // Legacy IPN sends `?id=...&topic=payment` and cannot be verified with
            // the Webhooks secret signature. It is handled separately below.
            @RequestParam(name = "id", required = false) String legacyId,
            @RequestParam(name = "topic", required = false) String legacyTopic,
            @RequestBody(required = false) MercadoPagoWebhookPayload payload
    ) {
        // Debug entry-point log: prints the raw inbound state of the request so
        // that a future 401 can be triaged without needing to reproduce it. The
        // x-signature value is never logged (only the length) to avoid leaking
        // HMACs into the log stream.
        log.info("MP webhook received uri={} method={} origin={} data.id={} legacy.id={} legacy.topic={} x-request-id={} sig.len={} user-agent={}",
                httpRequest.getRequestURI(),
                httpRequest.getMethod(),
                httpRequest.getHeader("Origin"),
                dataId,
                legacyId,
                legacyTopic,
                xRequestId,
                xSignature == null ? 0 : xSignature.length(),
                httpRequest.getHeader("User-Agent"));

        if (isLegacyPaymentIpn(dataId, legacyId, legacyTopic)) {
            processSafely(new MercadoPagoWebhookPayload(
                    legacyTopic,
                    "ipn.received",
                    legacyId,
                    new MercadoPagoWebhookPayload.Data(legacyId),
                    null,
                    null
            ));
            return ResponseEntity.ok(Map.of("received", true, "source", "ipn"));
        }

        try {
            signatureValidator.validate(xSignature, xRequestId, dataId);
        } catch (DomainException ex) {
            log.warn("Rejected Mercado Pago webhook: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("received", false, "reason", ex.getCode()));
        }
        if (payload != null) {
            processSafely(payload);
        }
        return ResponseEntity.ok(Map.of("received", true));
    }

    /** Returns true for legacy IPN notifications that cannot use Webhook HMAC validation. */
    private static boolean isLegacyPaymentIpn(String dataId, String legacyId, String legacyTopic) {
        return (dataId == null || dataId.isBlank())
                && legacyId != null && !legacyId.isBlank()
                && isKnownIpnTopic(legacyTopic);
    }

    /** Known IPN topics from Mercado Pago that signal payment/order events. */
    private static boolean isKnownIpnTopic(String topic) {
        if (topic == null) {
            return false;
        }
        return topic.equalsIgnoreCase("payment")
                || topic.equalsIgnoreCase("merchant_order")
                || topic.equalsIgnoreCase("topic_merchant_order_wh");
    }

    /** Logs processing failures but acknowledges MP so notifications are not retried forever. */
    private void processSafely(MercadoPagoWebhookPayload payload) {
        try {
            processor.process(payload);
        } catch (RuntimeException ex) {
            log.error("Failed to process Mercado Pago webhook", ex);
        }
    }
}
