package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

/**
 * Compact metric card used by the operational dashboard (S4-US04).
 *
 * <p>The frontend renders each card as a stat tile with an icon, label, value,
 * optional trend indicator, and an optional click target. The trend direction
 * is the only mandatory calculation the FE cares about; everything else is
 * pre-formatted to keep the chart components free of business logic.</p>
 *
 * @param label           short description, displayed uppercase (e.g. "Ventas del dia")
 * @param value           pre-formatted display string, currency or number with locale
 * @param subtitle        optional secondary line under the value
 * @param trend           one of {@code UP}, {@code DOWN}, {@code FLAT} or null
 * @param trendPercentage signed percentage change vs previous period, null when no
 *                        comparison data is available
 * @param iconName        PrimeIcons class (e.g. {@code pi-shopping-cart})
 * @param colorStyle      semantic style key: {@code SUCCESS}, {@code WARNING},
 *                        {@code DANGER}, {@code INFO}, or {@code NEUTRAL}
 * @param link            optional in-app route, when the card is clickable
 * @param tooltip         optional longer explanation for accessibility
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardStatCardDto(
        String label,
        String value,
        String subtitle,
        String trend,
        BigDecimal trendPercentage,
        String iconName,
        String colorStyle,
        String link,
        String tooltip
) {
}
