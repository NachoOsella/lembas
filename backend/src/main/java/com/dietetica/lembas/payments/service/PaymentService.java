package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.api.CashPaymentQuery;
import com.dietetica.lembas.payments.api.CustomerPaymentQuery;
import com.dietetica.lembas.payments.dto.PaymentSummaryDto;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Base application service for querying unified payments. */
@Service
public class PaymentService implements CashPaymentQuery, CustomerPaymentQuery {

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /** Returns all payments for the given order. */
    @Transactional(readOnly = true)
    public List<Payment> findByOrderId(Long orderId) {
        return paymentRepository.findByOrderIdOrderByIdAsc(orderId);
    }

    /** Returns payments for the given order and status. */
    @Transactional(readOnly = true)
    public List<Payment> findByOrderIdAndStatus(Long orderId, PaymentStatus status) {
        return paymentRepository.findByOrderIdAndStatusOrderByIdAsc(orderId, status);
    }

    /** Returns a payment by provider-side idempotency key when present. */
    @Transactional(readOnly = true)
    public Optional<Payment> findByProviderPaymentId(String providerPaymentId) {
        return paymentRepository.findByProviderPaymentId(providerPaymentId);
    }

    /**
     * Loads approved payments for cash reporting while keeping payment persistence inside this
     * module.
     */
    @Override
    @Transactional(readOnly = true)
    public List<Payment> findApprovedForCashSession(Long cashSessionId) {
        return paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(cashSessionId, PaymentStatus.APPROVED);
    }

    /** Loads and maps customer payment history inside the payments module. */
    @Override
    @Transactional(readOnly = true)
    public List<PaymentSummaryDto> findForCustomerOrder(Long orderId, Long customerUserId) {
        return paymentRepository.findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(orderId, customerUserId).stream()
                .map(PaymentService::toSummary)
                .toList();
    }

    private static PaymentSummaryDto toSummary(Payment payment) {
        return new PaymentSummaryDto(
                payment.getId(),
                payment.getProvider(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getAmount(),
                payment.getApprovedAt(),
                payment.getCreatedAt());
    }
}
