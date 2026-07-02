package com.dietetica.lembas.content.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.content.dto.FaqDto;
import com.dietetica.lembas.content.dto.FaqItemDto;
import com.dietetica.lembas.content.dto.TermsDto;
import com.dietetica.lembas.content.dto.TermsSectionDto;
import com.dietetica.lembas.content.service.LegalContentService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web slice tests for {@link LegalContentStoreController}.
 *
 * <p>Verifies that the public legal and FAQ endpoints:</p>
 * <ul>
 *   <li>Are reachable without authentication.</li>
 *   <li>Expose the full document payload (sections, items, ids).</li>
 *   <li>Map HTTP method correctly (only GET is supported).</li>
 * </ul>
 */
@WebMvcTest(controllers = {LegalContentStoreController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class LegalContentStoreControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LegalContentService legalContentService;

    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private LembasUserDetailsService userDetailsService;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getTermsReturnsDocument() throws Exception {
        when(legalContentService.getTerms()).thenReturn(new TermsDto(
                "Terminos y Condiciones",
                LocalDate.of(2026, 6, 1),
                "Intro del documento.",
                List.of(
                        new TermsSectionDto(
                                "1. Informacion general",
                                List.of("Parrafo uno.", "Parrafo dos."),
                                List.of("Bullet a", "Bullet b")
                        )
                )
        ));

        mockMvc.perform(get("/api/store/terms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Terminos y Condiciones"))
                .andExpect(jsonPath("$.lastUpdated").value("2026-06-01"))
                .andExpect(jsonPath("$.intro").value("Intro del documento."))
                .andExpect(jsonPath("$.sections").isArray())
                .andExpect(jsonPath("$.sections.length()").value(1))
                .andExpect(jsonPath("$.sections[0].title").value("1. Informacion general"))
                .andExpect(jsonPath("$.sections[0].paragraphs.length()").value(2))
                .andExpect(jsonPath("$.sections[0].paragraphs[0]").value("Parrafo uno."))
                .andExpect(jsonPath("$.sections[0].bullets.length()").value(2))
                .andExpect(jsonPath("$.sections[0].bullets[1]").value("Bullet b"));
    }

    @Test
    void getFaqReturnsDocument() throws Exception {
        when(legalContentService.getFaq()).thenReturn(new FaqDto(
                "Preguntas frecuentes",
                "Intro FAQ.",
                List.of(
                        new FaqItemDto("id-1", "Pregunta 1?", "Respuesta 1.", "Pedidos"),
                        new FaqItemDto("id-2", "Pregunta 2?", "Respuesta 2.", "Pagos")
                )
        ));

        mockMvc.perform(get("/api/store/faq"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Preguntas frecuentes"))
                .andExpect(jsonPath("$.intro").value("Intro FAQ."))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value("id-1"))
                .andExpect(jsonPath("$.items[0].question").value("Pregunta 1?"))
                .andExpect(jsonPath("$.items[0].answer").value("Respuesta 1."))
                .andExpect(jsonPath("$.items[0].category").value("Pedidos"))
                .andExpect(jsonPath("$.items[1].id").value("id-2"))
                .andExpect(jsonPath("$.items[1].category").value("Pagos"));
    }

}
