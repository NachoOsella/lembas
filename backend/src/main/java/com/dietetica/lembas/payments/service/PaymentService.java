package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/** Base application service for querying unified payments. */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

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
}
