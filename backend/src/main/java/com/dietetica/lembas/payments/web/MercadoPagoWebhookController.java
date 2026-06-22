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
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public inbound endpoint for Mercado Pago webhook notifications.
 *
 * <p>The endpoint is exposed under {@code /api/webhooks/**} which is allow-listed
 * in {@code SecurityConfig} so no authentication is required. Every request is
 * signature-verified; the processor is idempotent and always returns 200 OK
 * once the signature is accepted (so Mercado Pago does not retry on transient
 * application errors). Invalid signatures return 401.</p>
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
            @RequestHeader(name = "x-signature", required = false) String xSignature,
            @RequestHeader(name = "x-request-id", required = false) String xRequestId,
            @RequestBody MercadoPagoWebhookPayload payload
    ) {
        try {
            String dataId = payload.data() != null ? payload.data().id() : payload.id();
            signatureValidator.validate(xSignature, xRequestId, dataId);
        } catch (DomainException ex) {
            log.warn("Rejected Mercado Pago webhook: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("received", false, "reason", ex.getCode()));
        }
        try {
            processor.process(payload);
        } catch (RuntimeException ex) {
            // Log and still acknowledge so Mercado Pago does not retry forever.
            log.error("Failed to process Mercado Pago webhook", ex);
        }
        return ResponseEntity.ok(Map.of("received", true));
    }
}
