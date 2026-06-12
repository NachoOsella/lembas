package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for {@link PaymentService}. */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    void findByOrderIdShouldDelegateToRepository() {
        Payment payment = new Payment();
        when(paymentRepository.findByOrderIdOrderByIdAsc(10L)).thenReturn(List.of(payment));

        List<Payment> payments = paymentService.findByOrderId(10L);

        assertThat(payments).containsExactly(payment);
        verify(paymentRepository).findByOrderIdOrderByIdAsc(10L);
    }

    @Test
    void findByOrderIdAndStatusShouldDelegateToRepository() {
        Payment payment = new Payment();
        when(paymentRepository.findByOrderIdAndStatusOrderByIdAsc(10L, PaymentStatus.APPROVED))
                .thenReturn(List.of(payment));

        List<Payment> payments = paymentService.findByOrderIdAndStatus(10L, PaymentStatus.APPROVED);

        assertThat(payments).containsExactly(payment);
        verify(paymentRepository).findByOrderIdAndStatusOrderByIdAsc(10L, PaymentStatus.APPROVED);
    }

    @Test
    void findByProviderPaymentIdShouldDelegateToRepository() {
        Payment payment = new Payment();
        when(paymentRepository.findByProviderPaymentId("mp-1")).thenReturn(Optional.of(payment));

        Optional<Payment> found = paymentService.findByProviderPaymentId("mp-1");

        assertThat(found).contains(payment);
        verify(paymentRepository).findByProviderPaymentId("mp-1");
    }
}
