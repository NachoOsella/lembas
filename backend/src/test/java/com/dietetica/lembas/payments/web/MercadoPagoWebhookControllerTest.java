package com.dietetica.lembas.payments.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.service.MercadoPagoProperties;
import com.dietetica.lembas.payments.service.MercadoPagoWebhookProcessor;
import com.dietetica.lembas.payments.service.WebhookSignatureValidator;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Routing and signature tests for {@link MercadoPagoWebhookController}.
 */
@WebMvcTest(controllers = {MercadoPagoWebhookController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@Import(MercadoPagoWebhookControllerTest.TestBeans.class)
class MercadoPagoWebhookControllerTest {

    private static final String SECRET = "test-secret";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MercadoPagoWebhookProcessor processor;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    void shouldReturn200AndAcknowledgeWhenSignatureIsValid() throws Exception {
        String dataId = "PAY-1";
        String ts = "1700000000";
        String requestId = "abc";
        String v1 = hmac(SECRET, "id=" + dataId + "&request_id=" + requestId + "&ts=" + ts);
        when(processor.process(any())).thenReturn(Optional.of(1L));

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("x-signature", "ts=" + ts + ",v1=" + v1)
                        .header("x-request-id", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "payment",
                                  "action": "payment.created",
                                  "data": {"id": "PAY-1"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
        verify(processor).process(any(MercadoPagoWebhookPayload.class));
    }

    @Test
    void shouldReturn401WhenSignatureIsInvalid() throws Exception {
        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("x-signature", "ts=1700000000,v1=deadbeef")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "payment",
                                  "data": {"id": "PAY-1"}
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.received").value(false));
        verify(processor, never()).process(any());
    }

    @Test
    void shouldReturn401WhenSignatureHeaderIsMissing() throws Exception {
        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type": "payment", "data": {"id": "PAY-1"}}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn200EvenWhenProcessorThrows() throws Exception {
        String dataId = "PAY-2";
        String ts = "1700000000";
        String v1 = hmac(SECRET, "id=" + dataId + "&request_id=&ts=" + ts);
        when(processor.process(any())).thenThrow(new RuntimeException("DB down"));

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("x-signature", "ts=" + ts + ",v1=" + v1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type": "payment", "data": {"id": "PAY-2"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
    }

    private static String hmac(String secret, String manifest) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** Provides real webhook-side beans for the @WebMvcTest slice. */
    @TestConfiguration
    static class TestBeans {

        @Bean
        MercadoPagoProperties mercadoPagoProperties() {
            return new MercadoPagoProperties(
                    "token", SECRET, "https://api.mercadopago.com",
                    "https://ok", "https://fail", "https://pending", "https://notify", 5000L);
        }

        @Bean
        WebhookSignatureValidator webhookSignatureValidator(MercadoPagoProperties properties) {
            return new WebhookSignatureValidator(properties);
        }
    }
}
