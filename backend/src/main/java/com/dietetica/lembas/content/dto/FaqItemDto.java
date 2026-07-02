package com.dietetica.lembas.content.dto;

/**
 * A single FAQ entry.
 *
 * <p>The answer is plain text rendered inside an accordion panel.</p>
 *
 * @param id       stable identifier used by the frontend for tracking
 * @param question the question shown on the collapsed panel header
 * @param answer   the answer shown when the panel is expanded
 * @param category optional category label (e.g. "Pedidos", "Pagos")
 */
public record FaqItemDto(
        String id,
        String question,
        String answer,
        String category
) {
}
