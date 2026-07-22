package com.dietetica.lembas.payments.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.service.MercadoPagoProperties;
import com.dietetica.lembas.payments.service.MercadoPagoWebhookProcessor;
import com.dietetica.lembas.payments.service.WebhookSignatureValidator;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
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

/**
 * Routing and signature tests for {@link MercadoPagoWebhookController}.
 *
 * <p>MP sends {@code data.id} as a URL query parameter, so the test requests
 * include {@code ?data.id=...}. The manifest is built per the official MP
 * template {@code id:...;request-id:...;ts:...;}.</p>
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

    /** Manifest helper matching the official MP template (lowercases dataId). */
    private static String manifest(String dataId, String requestId, String ts) {
        StringBuilder sb = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            sb.append("id:").append(dataId.toLowerCase()).append(';');
        }
        if (requestId != null && !requestId.isBlank()) {
            sb.append("request-id:").append(requestId).append(';');
        }
        sb.append("ts:").append(ts).append(';');
        return sb.toString();
    }

    @Test
    void shouldReturn200AndAcknowledgeWhenSignatureIsValid() throws Exception {
        String dataId = "12345";
        String ts = "1700000000";
        String requestId = "abc";
        String v1 = hmac(SECRET, manifest(dataId, requestId, ts));
        when(processor.process(any())).thenReturn(Optional.of(1L));

        mockMvc.perform(
                        post("/api/webhooks/mercadopago?data.id=" + dataId)
                                .header("x-signature", "ts=" + ts + ",v1=" + v1)
                                .header("x-request-id", requestId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {
                                  "type": "payment",
                                  "action": "payment.created",
                                  "data": {"id": "12345"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
        verify(processor).process(any(MercadoPagoWebhookPayload.class));
    }

    @Test
    void shouldAcceptLegacyIpnPaymentWithoutWebhookSignatureValidation() throws Exception {
        when(processor.process(any())).thenReturn(Optional.of(1L));

        mockMvc.perform(
                        post("/api/webhooks/mercadopago?id=164559101305&topic=payment")
                                .header("x-signature", "ts=1782174452,v1=legacy-ipn-signature")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {"resource": "164559101305", "topic": "payment"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true))
                .andExpect(jsonPath("$.source").value("ipn"));
        verify(processor).process(any(MercadoPagoWebhookPayload.class));
    }

    @Test
    void shouldAcceptLegacyIpnMerchantOrderWithoutWebhookSignatureValidation() throws Exception {
        when(processor.process(any())).thenReturn(Optional.of(1L));

        mockMvc.perform(
                        post("/api/webhooks/mercadopago?id=42074945691&topic=merchant_order")
                                .header(
                                        "x-signature",
                                        "ts=1782177709,v1=33bde3ddf4d07495df5416234336f6e1f21ee4eb94bcc31d5020fb8d7584e620")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {"resource": "42074945691", "topic": "merchant_order"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true))
                .andExpect(jsonPath("$.source").value("ipn"));
        verify(processor).process(any(MercadoPagoWebhookPayload.class));
    }

    @Test
    void shouldReturn401WhenSignatureIsInvalid() throws Exception {
        mockMvc.perform(
                        post("/api/webhooks/mercadopago?data.id=12345")
                                .header("x-signature", "ts=1700000000,v1=deadbeef")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {
                                  "type": "payment",
                                  "data": {"id": "12345"}
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"))
                .andExpect(jsonPath("$.path").value("/api/webhooks/mercadopago"));
        verify(processor, never()).process(any());
    }

    @Test
    void shouldReturn401WhenSignatureHeaderIsMissing() throws Exception {
        mockMvc.perform(
                        post("/api/webhooks/mercadopago?data.id=12345")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {"type": "payment", "data": {"id": "12345"}}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"));
    }

    @Test
    void shouldReturn200EvenWhenProcessorThrows() throws Exception {
        String dataId = "67890";
        String ts = "1700000000";
        // No x-request-id header: request-id pair is omitted from the manifest.
        String v1 = hmac(SECRET, manifest(dataId, null, ts));
        when(processor.process(any())).thenThrow(new RuntimeException("DB down"));

        mockMvc.perform(
                        post("/api/webhooks/mercadopago?data.id=" + dataId)
                                .header("x-signature", "ts=" + ts + ",v1=" + v1)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {"type": "payment", "data": {"id": "67890"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));
    }

    @Test
    void shouldValidateSignatureUsingQueryDataIdNotBody() throws Exception {
        // The signature must validate against the query ?data.id, even when the
        // body data.id differs (MP sends a merchant_order where body has no id).
        String queryDataId = "42073962157";
        String ts = "1782171894";
        String requestId = "656248a4-b523-43ab-8835-baaa7553403e";
        String v1 = hmac(SECRET, manifest(queryDataId, requestId, ts));

        mockMvc.perform(
                        post("/api/webhooks/mercadopago?data.id=" + queryDataId)
                                .header("x-signature", "ts=" + ts + ",v1=" + v1)
                                .header("x-request-id", requestId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {
                                  "type": "topic_merchant_order_wh",
                                  "action": "update",
                                  "id": "42073962157",
                                  "data": {"status": "closed"}
                                }
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
                    "token",
                    SECRET,
                    "https://api.mercadopago.com",
                    "https://ok",
                    "https://fail",
                    "https://pending",
                    "https://notify",
                    5000L);
        }

        @Bean
        WebhookSignatureValidator webhookSignatureValidator(MercadoPagoProperties properties) {
            return new WebhookSignatureValidator(properties);
        }
    }
}
