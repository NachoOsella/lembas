package com.dietetica.lembas.content.dto;

import java.util.List;

/**
 * Public payload returned by {@code GET /api/store/faq}.
 *
 * @param title the page title shown above the accordion
 * @param intro optional intro line shown between the title and the first item
 * @param items the ordered list of FAQ items
 */
public record FaqDto(
        String title,
        String intro,
        List<FaqItemDto> items
) {
}
