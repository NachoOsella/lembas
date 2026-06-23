package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.Payment;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the sanitized JSON metadata that the webhook processor stores on the
 * {@link Payment} entity.
 *
 * <p>Strips fields considered sensitive (card, token, secret, payer PII) and
 * keeps only what reports and audit logs need. Delegates the actual JSON
 * serialization to {@link ObjectMapper} so escape rules and Unicode handling
 * match the rest of the application.</p>
 */
@Component
public class WebhookMetadataSerializer {

    /** Substring check, lowercased, used to drop sensitive provider fields. */
    private static final String[] SENSITIVE_KEY_FRAGMENTS = {"card", "token", "secret", "payer"};

    private final ObjectMapper objectMapper;

    public WebhookMetadataSerializer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Serializes the supplied payment and provider lookup into a JSON string. */
    public String serialize(Payment payment, GatewayPaymentLookup lookup) {
        Map<String, Object> safe = new LinkedHashMap<>();
        Map<String, Object> raw = lookup.rawMetadata();
        if (raw != null) {
            for (Map.Entry<String, Object> entry : raw.entrySet()) {
                String key = entry.getKey();
                if (key != null && !isSensitive(key)) {
                    safe.put(key, entry.getValue());
                }
            }
        }
        safe.put("providerPaymentId", lookup.providerPaymentId());
        safe.put("providerStatus", lookup.status());
        if (payment.getProviderPreferenceId() != null) {
            safe.put("providerPreferenceId", payment.getProviderPreferenceId());
        }
        try {
            return objectMapper.writeValueAsString(safe);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize webhook metadata", ex);
        }
    }

    /** Returns true when the key contains any of the configured sensitive fragments. */
    private static boolean isSensitive(String key) {
        String lower = key.toLowerCase();
        for (String fragment : SENSITIVE_KEY_FRAGMENTS) {
            if (lower.contains(fragment)) {
                return true;
            }
        }
        return false;
    }
}
