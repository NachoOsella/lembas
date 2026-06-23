package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.shared.exception.DomainException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.mercadopago.client.merchantorder.MerchantOrderClient;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.merchantorder.MerchantOrder;
import com.mercadopago.resources.merchantorder.MerchantOrderPayment;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;

/**
 * Mercado Pago implementation of {@link PaymentGateway} backed by the official
 * {@code com.mercadopago:sdk-java} SDK.
 *
 * <p>This class is a thin adapter: it translates application-level
 * {@link CreatePreferenceCommand} into {@link PreferenceRequest} (and the
 * inverse), wraps each SDK call in our retry policy, and sanitizes the
 * provider's response before surfacing it as {@link GatewayPaymentLookup}. The
 * SDK handles the actual HTTP transport, JSON marshalling, and the
 * {@code X-Idempotency-Key} header. Webhook signature validation is not part
 * of the SDK and is performed by {@link WebhookSignatureValidator}.</p>
 */
@Component
@ConditionalOnProperty(
        name = MercadoPagoConfiguration.GATEWAY_PROPERTY,
        havingValue = "mercadopago"
)
public class MercadoPagoGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoGateway.class);

    /** HTTP header the SDK uses for idempotency keys. */
    private static final String IDEMPOTENCY_HEADER = "X-Idempotency-Key";

    /** Maximum number of retries for 5xx and network errors. */
    private static final int MAX_RETRIES = 3;

    /** Initial backoff in milliseconds for retry attempts. */
    private static final long INITIAL_BACKOFF_MS = 200L;

    private final PreferenceClient preferenceClient;
    private final PaymentClient paymentClient;
    private final MerchantOrderClient merchantOrderClient;
    private final MPRequestOptions baseRequestOptions;
    private final ObjectMapper objectMapper;

    public MercadoPagoGateway(
            PreferenceClient preferenceClient,
            PaymentClient paymentClient,
            MerchantOrderClient merchantOrderClient,
            MPRequestOptions mercadoPagoRequestOptions
    ) {
        this.preferenceClient = preferenceClient;
        this.paymentClient = paymentClient;
        this.merchantOrderClient = merchantOrderClient;
        this.baseRequestOptions = mercadoPagoRequestOptions;
        this.objectMapper = new ObjectMapper()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }

    /** {@inheritDoc} */
    @Override
    public PaymentPreferenceResult createPreference(CreatePreferenceCommand command) {
        validate(command);
        PreferenceRequest request = buildPreferenceRequest(command);
        MPRequestOptions options = withIdempotencyKey(command.idempotencyKey());
        Preference preference = executeWithRetry(
                () -> preferenceClient.create(request, options),
                "create preference"
        );
        String preferenceId = preference.getId();
        if (preferenceId == null) {
            throw new DomainException("MP_INVALID_RESPONSE",
                    "Mercado Pago returned no preference id");
        }
        return new PaymentPreferenceResult(
                preferenceId,
                preference.getInitPoint(),
                preference.getSandboxInitPoint()
        );
    }

    /**
     * Finds the payment associated with a Mercado Pago merchant order.
     *
     * <p>Checkout Pro creates a merchant order that groups payments. IPN
     * notifications arrive with the merchant order id in {@code ?id=...}. This
     * method fetches the merchant order, extracts the first payment, and
     * returns it in the same shape as {@link #findPayment}.</p>
     */
    public Optional<GatewayPaymentLookup> findPaymentByMerchantOrderId(String merchantOrderId) {
        if (merchantOrderId == null || merchantOrderId.isBlank()) {
            return Optional.empty();
        }
        Long id = parseLongOrNull(merchantOrderId);
        if (id == null) {
            return Optional.empty();
        }
        MerchantOrder merchantOrder;
        try {
            merchantOrder = executeWithRetry(
                    () -> merchantOrderClient.get(id, baseRequestOptions),
                    "fetch merchant order " + id
            );
        } catch (DomainException ex) {
            if ("MP_NOT_FOUND".equals(ex.getCode())) {
                return Optional.empty();
            }
            throw ex;
        }
        List<MerchantOrderPayment> payments = merchantOrder.getPayments();
        if (payments == null || payments.isEmpty()) {
            return Optional.empty();
        }
        Long firstPaymentId = payments.get(0).getId();
        if (firstPaymentId == null) {
            return Optional.empty();
        }
        return findPayment(String.valueOf(firstPaymentId));
    }

    /** {@inheritDoc} */
    @Override
    public Optional<GatewayPaymentLookup> findPayment(String providerPaymentId) {
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            return Optional.empty();
        }
        Long id = parseLongOrNull(providerPaymentId);
        if (id == null) {
            return Optional.empty();
        }
        Payment payment;
        try {
            payment = executeWithRetry(
                    () -> paymentClient.get(id, baseRequestOptions),
                    "fetch payment " + id
            );
        } catch (DomainException ex) {
            if ("MP_NOT_FOUND".equals(ex.getCode())) {
                return Optional.empty();
            }
            throw ex;
        }
        if (payment == null || payment.getId() == null) {
            return Optional.empty();
        }
        // Build metadata from SDK fields directly (Jackson convertValue does not
        // work reliably with the SDK's Payment resource). The webhook processor
        // uses external_reference to match the local Payment record.
        Map<String, Object> metadata = new HashMap<>();
        if (payment.getExternalReference() != null) {
            metadata.put("external_reference", payment.getExternalReference());
        }
        if (payment.getCurrencyId() != null) {
            metadata.put("currency", payment.getCurrencyId());
        }
        return Optional.of(new GatewayPaymentLookup(
                String.valueOf(payment.getId()),
                payment.getStatus(),
                payment.getTransactionAmount(),
                payment.getCurrencyId(),
                metadata
        ));
    }

    // ------------------------------------------------------------------
    // Preference request building
    // ------------------------------------------------------------------

    /** Builds a Mercado Pago Checkout Pro preference request from the command. */
    private PreferenceRequest buildPreferenceRequest(CreatePreferenceCommand command) {
        PreferenceRequest.PreferenceRequestBuilder builder = PreferenceRequest.builder()
                .externalReference(command.externalReference())
                // notification_url is intentionally NOT set here so MP uses
                // the panel-level Webhooks URL, which signs notifications with
                // the correct secret. Preference-level URLs cause MP to use a
                // different internal dispatch system that produces HMAC values
                // incompatible with the panel's webhook secret.
                .backUrls(PreferenceBackUrlsRequest.builder()
                        .success(command.successUrl())
                        .failure(command.failureUrl())
                        .pending(command.pendingUrl())
                        .build())
                .items(toPreferenceItems(command.items()));
        if (command.customerEmail() != null && !command.customerEmail().isBlank()) {
            builder.payer(PreferencePayerRequest.builder()
                    .email(command.customerEmail())
                    .build());
        }
        return builder.build();
    }

    /** Converts internal preference items to the SDK's typed item shape. */
    private static List<PreferenceItemRequest> toPreferenceItems(
            List<CreatePreferenceCommand.PreferenceItem> items
    ) {
        List<PreferenceItemRequest> result = new ArrayList<>(items.size());
        for (CreatePreferenceCommand.PreferenceItem item : items) {
            result.add(PreferenceItemRequest.builder()
                    .id(item.productId() == null ? null : String.valueOf(item.productId()))
                    .title(item.title())
                    .quantity(item.quantity() == null ? null : item.quantity().intValue())
                    .unitPrice(item.unitPrice())
                    .currencyId("ARS")
                    .build());
        }
        return result;
    }

    /**
     * Adds the MP flag that makes preference-level notifications use Webhooks
     * instead of legacy IPN. IPN requests arrive as {@code ?id=...&topic=...}
     * and cannot be validated with the Webhooks secret signature.
     */
    private static String forceWebhookNotifications(String notificationUrl, String fallbackUrl) {
        String url = notificationUrl == null || notificationUrl.isBlank() ? fallbackUrl : notificationUrl;
        if (url.contains("source_news=")) {
            return url;
        }
        String separator = url.contains("?") ? "&" : "?";
        return url + separator + "source_news=webhooks";
    }

    // ------------------------------------------------------------------
    // Metadata sanitization
    // ------------------------------------------------------------------

    /**
     * Serializes the SDK resource to a plain map and strips fields that may
     * contain card data, tokens, or other provider secrets. Returns a defensive
     * copy so the SDK's typed object is not retained.
     */
    private Map<String, Object> sanitizeMetadata(Object sdkResource) {
        Map<String, Object> raw;
        try {
            raw = objectMapper.convertValue(sdkResource, new TypeReference<Map<String, Object>>() {});
        } catch (IllegalArgumentException ex) {
            log.warn("Could not convert {} to metadata map: {}", sdkResource.getClass().getSimpleName(),
                    ex.getMessage());
            return Map.of();
        }
        if (raw == null) {
            return Map.of();
        }
        Map<String, Object> safe = new HashMap<>(raw.size());
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            String key = entry.getKey();
            if (key == null) {
                continue;
            }
            String lower = key.toLowerCase();
            if (lower.contains("card") || lower.contains("token") || lower.contains("secret")) {
                continue;
            }
            safe.put(key, entry.getValue());
        }
        return safe;
    }

    // ------------------------------------------------------------------
    // Request options helpers
    // ------------------------------------------------------------------

    /**
     * Returns a fresh {@link MPRequestOptions} that carries the same timeouts
     * as {@code baseRequestOptions} plus the {@code X-Idempotency-Key} header
     * used to deduplicate preference creation retries.
     */
    private MPRequestOptions withIdempotencyKey(String idempotencyKey) {
        Map<String, String> headers = new HashMap<>();
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            headers.put(IDEMPOTENCY_HEADER, idempotencyKey);
        }
        return MPRequestOptions.builder()
                .connectionTimeout(baseRequestOptions.getConnectionTimeout())
                .connectionRequestTimeout(baseRequestOptions.getConnectionRequestTimeout())
                .socketTimeout(baseRequestOptions.getSocketTimeout())
                .customHeaders(headers)
                .build();
    }

    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------

    /** Validates a preference command before issuing the request. */
    private void validate(CreatePreferenceCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("CreatePreferenceCommand must not be null");
        }
        if (command.amount() == null || command.amount().signum() <= 0) {
            throw new DomainException("MP_INVALID_AMOUNT", "Order amount must be positive");
        }
        if (command.idempotencyKey() == null || command.idempotencyKey().isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
    }

    /** Parses a string id into a {@code Long} or returns null if the input is not numeric. */
    private static Long parseLongOrNull(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Retry and error mapping
    // ------------------------------------------------------------------

    /**
     * Retries the call on 5xx and network errors with exponential backoff. 4xx
     * errors are surfaced immediately because they signal client-side bugs
     * that retries will not fix. Any SDK exception is wrapped in a
     * {@link DomainException} with the appropriate code.
     */
    private <T> T executeWithRetry(Callable<T> call, String description) {
        DomainException last = null;
        long backoff = INITIAL_BACKOFF_MS;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return call.call();
            } catch (MPApiException ex) {
                int status = ex.getStatusCode();
                if (status >= 500) {
                    last = new DomainException("MP_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY,
                            "Mercado Pago upstream error: " + status);
                    log.warn("Mercado Pago server error attempt={} op={} status={}",
                            attempt, description, status);
                } else {
                    // 4xx -- client error, retries will not fix it.
                    throw translateApiError(ex, description);
                }
            } catch (MPException ex) {
                last = new DomainException("MP_UPSTREAM_ERROR", HttpStatus.BAD_GATEWAY,
                        "Mercado Pago upstream error: " + ex.getMessage());
                log.warn("Mercado Pago error attempt={} op={} cause={}",
                        attempt, description, ex.getMessage());
            } catch (Exception ex) {
                // Network/IO failure wrapped by the SDK or a generic SDK error.
                last = new DomainException("MP_UNREACHABLE", HttpStatus.BAD_GATEWAY,
                        "Mercado Pago is not reachable");
                log.warn("Mercado Pago unreachable attempt={} op={} cause={}",
                        attempt, description, ex.getMessage());
            }
            sleep(backoff);
            backoff *= 2;
        }
        throw last;
    }

    /** Maps an SDK API error to a domain exception with the documented code. */
    private DomainException translateApiError(MPApiException ex, String description) {
        int status = ex.getStatusCode();
        if (status == 401 || status == 403) {
            return new DomainException("MP_UNAUTHORIZED", HttpStatus.BAD_GATEWAY,
                    "Mercado Pago rejected the credentials");
        }
        if (status == 404) {
            return new DomainException("MP_NOT_FOUND", HttpStatus.BAD_GATEWAY,
                    "Mercado Pago resource not found: " + description);
        }
        return new DomainException("MP_PREFERENCE_REJECTED", HttpStatus.BAD_GATEWAY,
                "Mercado Pago rejected the request: " + status);
    }

    /** Suppresses InterruptedException while keeping the interrupt status. */
    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
