package com.dietetica.lembas.payments.repository;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence operations for unified payments. */
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /** Finds all payments associated with an order in stable insertion order. */
    List<Payment> findByOrderIdOrderByIdAsc(Long orderId);

    /** Locks one payment row after its owning order has been locked. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    /** Locks an order's payments in stable order after the caller locks the order row. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.order.id = :orderId order by p.id asc")
    List<Payment> findByOrderIdForUpdate(@Param("orderId") Long orderId);

    /**
     * Finds payments linked to a cash session, optionally filtered by status
     * and/or method, in stable insertion order. Used by the cash detail view
     * to surface APPROVED POS sales alongside manual movements.
     */
    List<Payment> findByCashSessionIdOrderByIdAsc(Long cashSessionId);

    /** Finds APPROVED payments of a given method linked to a cash session. */
    List<Payment> findByCashSessionIdAndStatusAndMethodOrderByIdAsc(
            Long cashSessionId, PaymentStatus status, PaymentMethod method);

    /**
     * Finds payments for a cash session filtered by lifecycle status, in
     * stable insertion order. Used by the close use case (S3-US08) to load
     * only the APPROVED payments that actually contributed to the drawer.
     */
    List<Payment> findByCashSessionIdAndStatusOrderByIdAsc(Long cashSessionId, PaymentStatus status);

    /** Finds payments for an order filtered by lifecycle status. */
    List<Payment> findByOrderIdAndStatusOrderByIdAsc(Long orderId, PaymentStatus status);

    /**
     * Finds open payments for an order and provider in stable insertion order.
     * Used by the preference service to cancel stale payments before creating
     * a fresh provider preference.
     */
    List<Payment> findByOrderIdAndProviderAndStatusInOrderByIdAsc(
            Long orderId, PaymentProvider provider, Collection<PaymentStatus> statuses);

    /** Finds payments owned by one customer for a given order, newest first. */
    List<Payment> findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(Long orderId, Long customerUserId);

    /** Finds a payment by provider-side payment id. */
    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    /** Finds the earliest payment created for a Mercado Pago preference id. */
    Optional<Payment> findFirstByProviderPreferenceIdOrderByIdAsc(String providerPreferenceId);

    /** Finds the earliest payment created for a provider external reference. */
    Optional<Payment> findFirstByExternalReferenceOrderByIdAsc(String externalReference);

    /** Finds the earliest open payment whose order number matches the provider external reference. */
    Optional<Payment> findFirstByOrderOrderNumberAndStatusInOrderByIdAsc(
            String orderNumber, Collection<PaymentStatus> statuses);
}
