package com.dietetica.lembas.payments.service;

import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePayerRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds Mercado Pago SDK {@link PreferenceRequest} objects from the
 * application-layer {@link CreatePreferenceCommand}.
 *
 * <p>Extracted from {@link MercadoPagoGateway} so the HTTP transport stays
 * focused on the SDK call and retry logic while the mapping from domain
 * objects to provider objects is a pure, testable function.</p>
 */
@Component
public class MercadoPagoPreferenceMapper {

    /**
     * Builds a Mercado Pago Checkout Pro preference request from the command.
     *
     * <p>The {@code notification_url} is intentionally NOT set here so MP uses
     * the panel-level Webhooks URL, which signs notifications with the correct
     * secret. Preference-level URLs cause MP to use a different internal
     * dispatch system that produces HMAC values incompatible with the panel's
     * webhook secret.</p>
     */
    public PreferenceRequest toPreferenceRequest(CreatePreferenceCommand command) {
        PreferenceRequest.PreferenceRequestBuilder builder = PreferenceRequest.builder()
                .externalReference(command.externalReference())
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
}
