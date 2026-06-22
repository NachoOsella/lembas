package com.dietetica.lembas.payments.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Inbound payload posted by Mercado Pago to {@code /api/webhooks/mercadopago}.
 *
 * <p>Only the fields the application needs are mapped. Any unknown properties
 * are ignored so future provider changes do not break deserialization. The
 * nested {@link Data} block is optional because the notification body differs
 * slightly between payment and merchant_order events.</p>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoWebhookPayload(

        @JsonProperty("type")
        String type,

        @JsonProperty("action")
        String action,

        @JsonProperty("id")
        String id,

        @JsonProperty("data")
        Data data,

        @JsonProperty("live_mode")
        Boolean liveMode,

        @JsonProperty("date_created")
        String dateCreated
) {

    /** Nested data block carrying the actual payment/merchant_order id. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Data(
            @JsonProperty("id") String id
    ) {
    }
}
