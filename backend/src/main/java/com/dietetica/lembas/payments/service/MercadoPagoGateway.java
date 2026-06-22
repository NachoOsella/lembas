package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.shared.exception.DomainException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Mercado Pago HTTP implementation of {@link PaymentGateway}.
 *
 * <p>Translates application-level {@link CreatePreferenceCommand} into the
 * documented Mercado Pago Checkout Pro request shape and surfaces the resulting
 * preference id and init points. Provider 4xx and 5xx responses are mapped to
 * domain exceptions so the application layer never has to deal with raw HTTP
 * errors. Lookups for already-created payments are performed against
 * {@code /v1/payments/{id}} and return the same {@link GatewayPaymentLookup}
 * shape as the fake gateway.</p>
 */
@Component
@ConditionalOnProperty(
        name = MercadoPagoConfiguration.GATEWAY_PROPERTY,
        havingValue = "mercadopago"
)
public class MercadoPagoGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoGateway.class);

    private static final String PREFERENCES_PATH = "/checkout/preferences";
    private static final String PAYMENT_LOOKUP_PATH_TEMPLATE = "/v1/payments/{id}";

    /** Maximum number of retries for 5xx and network errors. */
    private static final int MAX_RETRIES = 3;

    /** Initial backoff in milliseconds for retry attempts. */
    private static final long INITIAL_BACKOFF_MS = 200L;

    private final RestClient restClient;

    public MercadoPagoGateway(RestClient mercadoPagoRestClient) {
        this.restClient = mercadoPagoRestClient;
    }

    /** {@inheritDoc} */
    @Override
    public PaymentPreferenceResult createPreference(CreatePreferenceCommand command) {
        validate(command);
        Map<String, Object> body = buildRequestBody(command);
        Map<String, Object> response = executeWithRetry(() -> restClient.post()
                .uri(PREFERENCES_PATH)
                .header("X-Idempotency-Key", command.idempotencyKey())
                .body(body)
                .retrieve()
                .body(Map.class));
        String preferenceId = stringValue(response.get("id"));
        if (preferenceId == null) {
            throw new DomainException("MP_INVALID_RESPONSE", "Mercado Pago returned no preference id");
        }
        return new PaymentPreferenceResult(
                preferenceId,
                stringValue(response.get("init_point")),
                stringValue(response.get("sandbox_init_point"))
        );
    }

    /** {@inheritDoc} */
    @Override
    public Optional<GatewayPaymentLookup> findPayment(String providerPaymentId) {
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            return Optional.empty();
        }
        Map<String, Object> body = executeWithRetry(() -> restClient.get()
                .uri(PAYMENT_LOOKUP_PATH_TEMPLATE, providerPaymentId)
                .retrieve()
                .body(Map.class));
        if (body == null) {
            return Optional.empty();
        }
        String id = stringValue(body.get("id"));
        if (id == null) {
            return Optional.empty();
        }
        return Optional.of(new GatewayPaymentLookup(
                id,
                stringValue(body.get("status")),
                toBigDecimal(body.get("transaction_amount")),
                stringValue(body.get("currency_id")),
                sanitizeMetadata(body)
        ));
    }

    /** Builds the Mercado Pago Checkout Pro request payload. */
    private Map<String, Object> buildRequestBody(CreatePreferenceCommand command) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("external_reference", command.externalReference());
        body.put("notification_url", ""); // wired by the webhook controller in production
        body.put("back_urls", Map.of(
                "success", command.successUrl(),
                "failure", command.failureUrl(),
                "pending", command.pendingUrl()
        ));
        body.put("auto_return", "approved");
        body.put("items", command.items().stream().map(this::toItem).toList());
        if (command.customerEmail() != null && !command.customerEmail().isBlank()) {
            body.put("payer", Map.of("email", command.customerEmail()));
        }
        return body;
    }

    /** Converts an internal preference item to the Mercado Pago item shape. */
    private Map<String, Object> toItem(CreatePreferenceCommand.PreferenceItem item) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", String.valueOf(item.productId()));
        map.put("title", item.title());
        map.put("quantity", item.quantity());
        map.put("unit_price", item.unitPrice());
        map.put("currency_id", "ARS");
        return map;
    }

    /** Strips provider metadata of fields considered sensitive before returning it. */
    private Map<String, Object> sanitizeMetadata(Map<String, Object> body) {
        Map<String, Object> safe = new HashMap<>();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
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

    /** Extracts a trimmed String from a map value, returning null for non-strings. */
    private static String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    /** Converts arbitrary numeric JSON values to BigDecimal. */
    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal big) {
            return big;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /**
     * Retries the call on 5xx and network errors with exponential backoff.
     * 4xx errors are surfaced immediately because they signal client-side bugs
     * that retries will not fix.
     */
    private <T> T executeWithRetry(Callable<T> call) {
        RuntimeException last = null;
        long backoff = INITIAL_BACKOFF_MS;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return call.run();
            } catch (HttpClientErrorException ex) {
                throw translateClientError(ex);
            } catch (HttpServerErrorException ex) {
                last = translateServerError(ex);
                log.warn("Mercado Pago server error attempt={} status={} body={}",
                        attempt, ex.getStatusCode(), ex.getResponseBodyAsString());
            } catch (ResourceAccessException ex) {
                last = new DomainException("MP_UNREACHABLE", org.springframework.http.HttpStatus.BAD_GATEWAY,
                        "Mercado Pago is not reachable");
                log.warn("Mercado Pago unreachable attempt={} cause={}", attempt, ex.getMessage());
            }
            sleep(backoff);
            backoff *= 2;
        }
        throw last;
    }

    /** Maps a 4xx response to a domain exception with the documented code. */
    private DomainException translateClientError(HttpClientErrorException ex) {
        HttpStatusCode status = ex.getStatusCode();
        if (status.value() == 401 || status.value() == 403) {
            return new DomainException("MP_UNAUTHORIZED", org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "Mercado Pago rejected the credentials");
        }
        if (status.value() == 404) {
            return new DomainException("MP_NOT_FOUND", org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "Mercado Pago resource not found");
        }
        return new DomainException("MP_PREFERENCE_REJECTED", org.springframework.http.HttpStatus.BAD_GATEWAY,
                "Mercado Pago rejected the request: " + status.value());
    }

    /** Maps a 5xx response to a domain exception so callers see a uniform code. */
    private DomainException translateServerError(HttpServerErrorException ex) {
        return new DomainException("MP_UPSTREAM_ERROR", org.springframework.http.HttpStatus.BAD_GATEWAY,
                "Mercado Pago upstream error: " + ex.getStatusCode().value());
    }

    /** Suppresses InterruptedException while keeping the interrupt status. */
    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    /** Functional shape used by {@link #executeWithRetry} to keep the call site concise. */
    @FunctionalInterface
    private interface Callable<T> {
        T run();
    }
}
