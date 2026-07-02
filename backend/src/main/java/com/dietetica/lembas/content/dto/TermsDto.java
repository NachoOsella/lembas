package com.dietetica.lembas.content.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Public payload returned by {@code GET /api/store/terms}.
 *
 * <p>Contains the full terms and conditions document split into sections
 * so the frontend can render it progressively and deep-link each section.</p>
 *
 * @param title        the document title shown at the top of the page
 * @param lastUpdated  the date the document was last updated (ISO-8601)
 * @param intro        an optional intro paragraph shown before the first section
 * @param sections     the ordered list of sections
 */
public record TermsDto(
        String title,
        LocalDate lastUpdated,
        String intro,
        List<TermsSectionDto> sections
) {
}
