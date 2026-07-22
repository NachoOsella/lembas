package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/** Provides payment-row locks to order lifecycle operations without exposing payment persistence. */
@Service
public class PaymentLockService {

    private final PaymentRepository paymentRepository;

    public PaymentLockService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /**
     * Locks an order's payments in stable id order.
     *
     * <p>The caller must already hold the owning order row lock so webhook and cancellation paths
     * always acquire database locks in the same order.</p>
     */
    public List<Payment> lockForOrder(Long orderId) {
        return paymentRepository.findByOrderIdForUpdate(orderId);
    }
}
