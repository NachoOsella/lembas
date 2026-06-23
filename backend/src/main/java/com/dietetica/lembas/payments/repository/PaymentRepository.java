package com.dietetica.lembas.payments.repository;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Persistence operations for unified payments. */
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /** Finds all payments associated with an order in stable insertion order. */
    List<Payment> findByOrderIdOrderByIdAsc(Long orderId);

    /** Finds payments for an order filtered by lifecycle status. */
    List<Payment> findByOrderIdAndStatusOrderByIdAsc(Long orderId, PaymentStatus status);

    /** Finds a payment by provider-side payment id. */
    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    /** Finds the earliest payment created for a Mercado Pago preference id. */
    Optional<Payment> findFirstByProviderPreferenceIdOrderByIdAsc(String providerPreferenceId);

    /** Finds the earliest payment created for a provider external reference. */
    Optional<Payment> findFirstByExternalReferenceOrderByIdAsc(String externalReference);

    /** Finds the earliest open payment whose order number matches the provider external reference. */
    Optional<Payment> findFirstByOrderOrderNumberAndStatusInOrderByIdAsc(
            String orderNumber,
            Collection<PaymentStatus> statuses
    );
}
