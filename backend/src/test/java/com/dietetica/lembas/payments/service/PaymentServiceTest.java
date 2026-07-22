package com.dietetica.lembas.payments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.payments.dto.PaymentSummaryDto;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @Test
    void findApprovedForCashSessionShouldApplyApprovedFilter() {
        Payment payment = new Payment();
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(7L, PaymentStatus.APPROVED))
                .thenReturn(List.of(payment));

        List<Payment> payments = paymentService.findApprovedForCashSession(7L);

        assertThat(payments).containsExactly(payment);
        verify(paymentRepository).findByCashSessionIdAndStatusOrderByIdAsc(7L, PaymentStatus.APPROVED);
    }

    @Test
    void findForCustomerOrderMapsPaymentToSummary() {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(new java.math.BigDecimal("1500.00"));
        payment.setCreatedAt(java.time.OffsetDateTime.parse("2026-01-01T12:00:00Z"));
        when(paymentRepository.findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(42L, 10L))
                .thenReturn(List.of(payment));

        List<PaymentSummaryDto> summaries = paymentService.findForCustomerOrder(42L, 10L);

        assertThat(summaries).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo(1L);
            assertThat(summary.provider()).isEqualTo(PaymentProvider.MERCADO_PAGO);
            assertThat(summary.method()).isEqualTo(PaymentMethod.CHECKOUT_PRO);
            assertThat(summary.status()).isEqualTo(PaymentStatus.PENDING);
            assertThat(summary.amount()).isEqualByComparingTo("1500.00");
        });
        verify(paymentRepository).findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(42L, 10L);
    }
}
