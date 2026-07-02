package com.dietetica.lembas.content.web;

import com.dietetica.lembas.content.dto.FaqDto;
import com.dietetica.lembas.content.dto.TermsDto;
import com.dietetica.lembas.content.service.LegalContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST controller that exposes the legal and FAQ content for the
 * online store.
 *
 * <p>All endpoints are publicly accessible (no authentication required)
 * as configured in {@link com.dietetica.lembas.shared.config.SecurityConfig}
 * via the {@code /api/store/**} matcher.</p>
 */
@RestController
@RequestMapping("/api/store")
public class LegalContentStoreController {

    private final LegalContentService legalContentService;

    public LegalContentStoreController(LegalContentService legalContentService) {
        this.legalContentService = legalContentService;
    }

    /**
     * Returns the full terms and conditions document.
     *
     * @return the terms document split into sections
     */
    @GetMapping("/terms")
    public TermsDto getTerms() {
        return legalContentService.getTerms();
    }

    /**
     * Returns the FAQ document with all entries.
     *
     * @return the FAQ document
     */
    @GetMapping("/faq")
    public FaqDto getFaq() {
        return legalContentService.getFaq();
    }
}
