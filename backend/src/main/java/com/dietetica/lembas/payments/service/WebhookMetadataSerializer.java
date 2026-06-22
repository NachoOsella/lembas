package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.Payment;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the sanitized JSON metadata that the webhook processor stores on the
 * {@link Payment} entity. Strips fields considered sensitive and keeps only
 * what reports and audit logs need.
 */
final class WebhookMetadataSerializer {

    /** Serializes the supplied payment and provider lookup into a JSON string. */
    static String serialize(Payment payment, GatewayPaymentLookup lookup) {
        Map<String, Object> safe = new LinkedHashMap<>();
        if (lookup.rawMetadata() != null) {
            for (Map.Entry<String, Object> entry : lookup.rawMetadata().entrySet()) {
                String key = entry.getKey();
                if (key == null) {
                    continue;
                }
                String lower = key.toLowerCase();
                if (lower.contains("card")
                        || lower.contains("token")
                        || lower.contains("secret")
                        || lower.contains("payer")) {
                    continue;
                }
                safe.put(key, entry.getValue());
            }
        }
        safe.put("providerPaymentId", lookup.providerPaymentId());
        safe.put("providerStatus", lookup.status());
        if (payment.getProviderPreferenceId() != null) {
            safe.put("providerPreferenceId", payment.getProviderPreferenceId());
        }
        return JsonStringBuilder.build(safe);
    }

    private WebhookMetadataSerializer() {
    }
}
