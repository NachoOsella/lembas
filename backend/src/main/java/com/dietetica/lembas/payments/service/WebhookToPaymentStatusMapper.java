package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.PaymentStatus;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;

/**
 * Translates the raw provider status returned by Mercado Pago into the
 * application's internal {@link PaymentStatus} enum.
 *
 * <p>The mapping follows the documented payment lifecycle: {@code approved}
 * and {@code authorized} are approval, {@code pending} and {@code in_process}
 * stay in {@code IN_PROCESS}, and the remaining states map to their closest
 * internal equivalent. Unknown statuses fall back to {@code PENDING} so the
 * processor does not lose a notification and the operation can be retried.</p>
 */
@Component
public class WebhookToPaymentStatusMapper {

    private static final Map<String, PaymentStatus> RAW_TO_INTERNAL = Map.ofEntries(
            Map.entry("approved", PaymentStatus.APPROVED),
            Map.entry("authorized", PaymentStatus.APPROVED),
            Map.entry("pending", PaymentStatus.IN_PROCESS),
            Map.entry("in_process", PaymentStatus.IN_PROCESS),
            Map.entry("in_mediation", PaymentStatus.IN_PROCESS),
            Map.entry("rejected", PaymentStatus.REJECTED),
            Map.entry("cancelled", PaymentStatus.CANCELLED),
            Map.entry("expired", PaymentStatus.EXPIRED),
            Map.entry("refunded", PaymentStatus.REFUNDED),
            Map.entry("charged_back", PaymentStatus.REFUNDED)
    );

    /** Maps the supplied provider status (case-insensitive) to a {@link PaymentStatus}. */
    public PaymentStatus map(String providerStatus) {
        if (providerStatus == null || providerStatus.isBlank()) {
            return PaymentStatus.PENDING;
        }
        return RAW_TO_INTERNAL.getOrDefault(
                providerStatus.toLowerCase(Locale.ROOT),
                PaymentStatus.PENDING
        );
    }

    /** Returns true when the supplied status is final and should not be reprocessed. */
    public boolean isTerminal(PaymentStatus status) {
        return status == PaymentStatus.APPROVED
                || status == PaymentStatus.REJECTED
                || status == PaymentStatus.CANCELLED
                || status == PaymentStatus.REFUNDED
                || status == PaymentStatus.EXPIRED;
    }
}
