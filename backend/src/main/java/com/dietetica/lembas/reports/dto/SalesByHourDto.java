package com.dietetica.lembas.reports.dto;

import java.math.BigDecimal;

/**
 * One bucket in the dashboard "sales by hour" bar chart (S4-US04).
 *
 * <p>{@code hour} is the 0-23 hour of the day in the JVM default timezone. The
 * repository query is responsible for filtering out empty hours so the FE
 * renders a clean 24-bucket chart.</p>
 */
public record SalesByHourDto(
        int hour,
        long orderCount,
        BigDecimal totalRevenue,
        long onlineOrders,
        long posOrders
) {
}
