package com.dietetica.lembas.payments.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.payments.service.PreferenceService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and routing tests for {@link CustomerPaymentController}.
 *
 * <p>The controller enforces ownership at the JPA query level (no in-memory
 * filtering), so these tests focus on the public contract: 200 on success,
 * 404 when the order belongs to a different customer or does not exist, and
 * 5xx when the gateway errors propagate.</p>
 */
@WebMvcTest(controllers = {CustomerPaymentController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class CustomerPaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PreferenceService preferenceService;

    @MockitoBean
    private PaymentRepository paymentRepository;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    void shouldCreatePreferenceWhenCustomerIsAuthenticated() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);
        when(preferenceService.createPreference(42L, customer))
                .thenReturn(new CreatePreferenceResponse(99L, "PREF-1", "https://init/PREF-1"));

        mockMvc.perform(post("/api/customer/orders/42/payments/preference"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId").value(99))
                .andExpect(jsonPath("$.preferenceId").value("PREF-1"))
                .andExpect(jsonPath("$.initPoint").value("https://init/PREF-1"));
    }

    @Test
    void shouldReturnNotFoundWhenPreferenceServiceRaisesOrderNotFound() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);
        when(preferenceService.createPreference(any(), any()))
                .thenThrow(new DomainException("ORDER_NOT_FOUND", org.springframework.http.HttpStatus.NOT_FOUND, "Order not found"));

        mockMvc.perform(post("/api/customer/orders/999/payments/preference"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void shouldReturnConflictWhenOrderIsNotPayable() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);
        when(preferenceService.createPreference(any(), any()))
                .thenThrow(new DomainException("ORDER_NOT_PAYABLE", org.springframework.http.HttpStatus.CONFLICT, "Only online orders support hosted checkout"));

        mockMvc.perform(post("/api/customer/orders/42/payments/preference"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_PAYABLE"));
    }

    @Test
    void shouldReturnBadGatewayWhenGatewayFails() throws Exception {
        User customer = new User(10L, "c@lembas.com", "hash", "Test", "Customer", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);
        when(preferenceService.createPreference(any(), any()))
                .thenThrow(new DomainException("MP_PREFERENCE_REJECTED", org.springframework.http.HttpStatus.BAD_GATEWAY, "Mercado Pago rejected the request"));

        mockMvc.perform(post("/api/customer/orders/42/payments/preference"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("MP_PREFERENCE_REJECTED"));
    }

    @Test
    void shouldListOnlyCustomerOwnPayments() throws Exception {
        User customer = userWithId(10L, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        Payment payment = samplePayment(customer);
        when(paymentRepository.findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(eq(42L), eq(10L)))
                .thenReturn(List.of(payment));

        mockMvc.perform(get("/api/customer/orders/42/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("MERCADO_PAGO"))
                .andExpect(jsonPath("$[0].method").value("CHECKOUT_PRO"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void shouldReturnEmptyListWhenNoPayments() throws Exception {
        User customer = userWithId(10L, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);
        when(paymentRepository.findByOrderIdAndOrderCustomerUserIdOrderByIdAsc(eq(42L), eq(10L)))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/customer/orders/42/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    private static Payment samplePayment(User customer) {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("1500.00"));
        payment.setCreatedAt(OffsetDateTime.now());
        com.dietetica.lembas.orders.model.Order order = new com.dietetica.lembas.orders.model.Order();
        order.setId(42L);
        order.setCustomerUser(customer);
        payment.setOrder(order);
        return payment;
    }

    /** Builds a User with the auto-generated id populated via reflection for unit tests. */
    private static User userWithId(long id, Role role) {
        User user = new User(null, "u" + id + "@lembas.com", "hash", "Test", "User", null, role);
        try {
            java.lang.reflect.Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
            return user;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot set User id for tests", ex);
        }
    }
}
