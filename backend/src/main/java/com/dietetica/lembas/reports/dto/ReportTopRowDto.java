package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One row of a "top N" list (top products, top suppliers, low-stock
 * products). The fields are intentionally generic so the FE can pick
 * the right combination per report:
 *
 * <ul>
 *   <li>{@code id} is the underlying entity id (or a stringified
 *       composite for low-stock rows that pair product + branch).</li>
 *   <li>{@code primary} is the headline label (product name, supplier
 *       name, etc.).</li>
 *   <li>{@code secondary} is a subtitle (category, branch, etc.).</li>
 *   <li>{@code metric} is the formatted headline number; {@code
 *       submetric} is the secondary counter.</li>
 *   <li>{@code badge} is an optional status tag ("Bajo minimo",
 *       "Vence 7d", etc.).</li>
 * </ul>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportTopRowDto(
        Object id,
        String primary,
        String secondary,
        String metric,
        String submetric,
        String badge
) {
}
