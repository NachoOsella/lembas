package com.dietetica.lembas.payments.service;

import java.util.Locale;
import java.util.Set;

/**
 * Recognised Mercado Pago IPN topics that trigger payment-related processing.
 *
 * <p>MP Webhook notifications use signed payloads and arrive with a structured
 * JSON body. Legacy IPN requests arrive as {@code ?id=...&topic=...} and
 * cannot be validated with the Webhooks secret signature, so the controller
 * accepts them only for the topics listed here and reconciles them against
 * the provider API before any local state changes.</p>
 */
public final class IpnTopics {

    public static final String PAYMENT = "payment";
    public static final String MERCHANT_ORDER = "merchant_order";
    public static final String MERCHANT_ORDER_WH = "topic_merchant_order_wh";

    private static final Set<String> KNOWN = Set.of(PAYMENT, MERCHANT_ORDER, MERCHANT_ORDER_WH);

    private IpnTopics() {
    }

    /** Returns true when the supplied topic triggers payment processing. */
    public static boolean isKnown(String topic) {
        if (topic == null) {
            return false;
        }
        return KNOWN.contains(topic.toLowerCase(Locale.ROOT));
    }

    /** Returns true when the topic references a merchant-order resource. */
    public static boolean isMerchantOrder(String topic) {
        if (topic == null) {
            return false;
        }
        String lower = topic.toLowerCase(Locale.ROOT);
        return MERCHANT_ORDER.equals(lower) || MERCHANT_ORDER_WH.equals(lower);
    }
}
