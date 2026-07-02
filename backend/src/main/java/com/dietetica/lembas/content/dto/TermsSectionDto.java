package com.dietetica.lembas.content.dto;

import java.util.List;

/**
 * A single section of the terms and conditions document.
 *
 * <p>Each section is rendered as a heading followed by one or more paragraphs.
 * Bullets (optional) render as a vertical list under the section.</p>
 *
 * @param title    the section heading
 * @param paragraphs free-form paragraphs shown one after the other
 * @param bullets  optional bulleted list under the section
 */
public record TermsSectionDto(
        String title,
        List<String> paragraphs,
        List<String> bullets
) {
    /**
     * Creates a section with paragraphs only (no bullets).
     */
    public TermsSectionDto(String title, List<String> paragraphs) {
        this(title, paragraphs, List.of());
    }
}
