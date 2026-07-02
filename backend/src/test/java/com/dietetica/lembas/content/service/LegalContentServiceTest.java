package com.dietetica.lembas.content.service;

import com.dietetica.lembas.content.dto.FaqDto;
import com.dietetica.lembas.content.dto.FaqItemDto;
import com.dietetica.lembas.content.dto.TermsDto;
import com.dietetica.lembas.content.dto.TermsSectionDto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link LegalContentService}.
 *
 * <p>Verifies the structural contract of the returned documents and the
 * presence of the legal references required for an Argentine e-commerce
 * (Ley 24.240, Ley 25.326, Disposicion 954/2025, AAIP, ARS).</p>
 */
class LegalContentServiceTest {

    private final LegalContentService service = new LegalContentService();

    @Test
    void getTermsReturnsPopulatedDocument() {
        TermsDto terms = service.getTerms();

        assertThat(terms.title()).isNotBlank();
        assertThat(terms.lastUpdated()).isNotNull();
        assertThat(terms.intro()).isNotBlank();
        assertThat(terms.sections()).isNotEmpty();
    }

    @Test
    void getTermsSectionsAreOrderedAndNonEmpty() {
        TermsDto terms = service.getTerms();

        assertThat(terms.sections())
                .allSatisfy(section -> {
                    assertThat(section.title()).isNotBlank();
                    assertThat(section.paragraphs()).isNotEmpty();
                    assertThat(section.paragraphs()).allSatisfy(p -> assertThat(p).isNotBlank());
                });

        // First section should identify the provider so the document opens with identification.
        assertThat(terms.sections().get(0).title()).contains("Identificacion del proveedor");
    }

    @Test
    void getTermsSectionTitlesAreUnique() {
        TermsDto terms = service.getTerms();

        long uniqueTitles = terms.sections().stream()
                .map(TermsSectionDto::title)
                .distinct()
                .count();

        assertThat(uniqueTitles).isEqualTo(terms.sections().size());
    }

    @Test
    void getTermsMentionsArgentineConsumerProtectionLaw() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // Ley 24.240 (defensa del consumidor) y articulos clave deben estar citados.
        assertThat(body).contains("Ley 24.240");
        assertThat(body).contains("articulo 34");
        assertThat(body).contains("articulos 10 a 17");
    }

    @Test
    void getTermsMentionsPersonalDataProtectionAndAAIP() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // Ley 25.326 y autoridad de aplicacion (AAIP) deben estar mencionados.
        assertThat(body).contains("Ley 25.326");
        assertThat(body).contains("AAIP");
        // Plazo de 10 dias corridos para derechos ARCO.
        assertThat(body).contains("10 dias corridos");
        // Derechos ARCO explicitos.
        assertThat(body).contains("Acceso")
                .contains("Rectificacion")
                .contains("Cancelacion")
                .contains("Oposicion");
    }

    @Test
    void getTermsExplainsPerishableProductsExceptionToArrepentimiento() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // La excepcion para perecederos (Art. 3 d) Disp. 954/2025) debe quedar explicita
        // porque es la que aplica a una dietetica.
        assertThat(body).contains("954/2025");
        assertThat(body).contains("perecederos");
    }

    @Test
    void getTermsOffersVoluntaryCancellationBeyondLegalMinimum() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // Aclaramos que la cancelacion es voluntaria y excede el derecho legal.
        assertThat(body).contains("ofrece voluntariamente");
        assertThat(body).contains("mientras")
                .contains("no haya sido retirado");
    }

    @Test
    void getTermsCitesArsAsOnlyCurrency() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // La moneda ARS debe estar mencionada y ningun precio debe prometer facturacion fiscal.
        assertThat(body).contains("pesos argentinos (ARS)");
        assertThat(body).contains("AFIP/ARCA");
    }

    @Test
    void getTermsPickupOnlyAndCitesBranch() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // Aclaracion explicita de que no hay delivery.
        assertThat(body).contains("No se realizan envios a domicilio");
        // Sucursal principal y jurisdiccion Cordoba Capital.
        assertThat(body).contains("Cordoba Capital");
    }

    @Test
    void getTermsStatesNoPushNotifications() {
        TermsDto terms = service.getTerms();
        String body = flatten(terms);

        // El dominio no envia notificaciones push; el cliente consulta "Mis pedidos".
        assertThat(body).contains("no envia notificaciones automaticas");
    }

    @Test
    void getFaqReturnsPopulatedDocument() {
        FaqDto faq = service.getFaq();

        assertThat(faq.title()).isNotBlank();
        assertThat(faq.intro()).isNotBlank();
        assertThat(faq.items()).isNotEmpty();
    }

    @Test
    void getFaqItemsHaveUniqueIds() {
        FaqDto faq = service.getFaq();

        long uniqueIds = faq.items().stream()
                .map(FaqItemDto::id)
                .distinct()
                .count();

        assertThat(uniqueIds).isEqualTo(faq.items().size());
    }

    @Test
    void getFaqItemsAreFullyPopulated() {
        FaqDto faq = service.getFaq();

        assertThat(faq.items())
                .allSatisfy(item -> {
                    assertThat(item.id()).isNotBlank();
                    assertThat(item.question()).isNotBlank();
                    assertThat(item.answer()).isNotBlank();
                    assertThat(item.category()).isNotBlank();
                });
    }

    @Test
    void getFaqItemsAreOrdered() {
        FaqDto faq = service.getFaq();

        // "como-comprar" debe ser el primero para mostrar la duda mas comun al inicio.
        assertThat(faq.items().get(0).id()).isEqualTo("como-comprar");
    }

    @Test
    void getFaqCoversStockConflictAndPerishableException() {
        FaqDto faq = service.getFaq();

        assertThat(faq.items())
                .extracting(FaqItemDto::id)
                .contains("que-es-conflicto-stock", "arrepentimiento");

        // El item sobre arrepentimiento debe citar la Disp. 954/2025.
        FaqItemDto arrepentimiento = faq.items().stream()
                .filter(item -> "arrepentimiento".equals(item.id()))
                .findFirst()
                .orElseThrow();
        assertThat(arrepentimiento.answer()).contains("954/2025");
    }

    @Test
    void getFaqCoversPickupOnlyAndArsOnly() {
        FaqDto faq = service.getFaq();
        String body = faq.items().stream()
                .map(FaqItemDto::answer)
                .reduce("", (a, b) -> a + " " + b);

        // La FAQ debe sostener el principio de pickup-only (sucursal + retiro) y ARS como unica moneda.
        assertThat(body).containsAnyOf("sucursal", "retirar");
        assertThat(body).contains("pesos argentinos (ARS)");
        // No debe prometer envios a domicilio.
        assertThat(body).doesNotContain("envio a domicilio");
        assertThat(body).doesNotContain("delivery");
    }

    @Test
    void getFaqCoversAllPaymentMethods() {
        FaqDto faq = service.getFaq();

        // El item de medios de pago online menciona Mercado Pago como integrador.
        FaqItemDto online = faq.items().stream()
                .filter(item -> "medios-de-pago-online".equals(item.id()))
                .findFirst()
                .orElseThrow();
        assertThat(online.answer()).contains("Mercado Pago");

        // El item de medios de pago en sucursal cubre efectivo, QR, transferencia, debito, credito.
        FaqItemDto presencial = faq.items().stream()
                .filter(item -> "medios-de-pago-sucursal".equals(item.id()))
                .findFirst()
                .orElseThrow();
        assertThat(presencial.answer())
                .contains("efectivo")
                .contains("QR")
                .contains("transferencia")
                .contains("debito")
                .contains("credito");
    }

    /** Flattens the terms document into a single string for substring assertions. */
    private String flatten(TermsDto terms) {
        StringBuilder sb = new StringBuilder(terms.title()).append(' ').append(terms.intro());
        for (TermsSectionDto section : terms.sections()) {
            sb.append(' ').append(section.title());
            for (String p : section.paragraphs()) {
                sb.append(' ').append(p);
            }
            for (String b : section.bullets()) {
                sb.append(' ').append(b);
            }
        }
        return sb.toString();
    }
}
