package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Aggregated operational dashboard payload (S4-US04).
 *
 * <p>The DTO is the single response of {@code GET /api/admin/reports/dashboard}.
 * It groups the headline metrics (ten stat cards), the period detail (top
 * products, sales by hour, sales by payment method) and three trend indicators
 * comparing the current day to the previous period.</p>
 *
 * <p>{@code branchId} is {@code null} when the response aggregates every branch
 * (ADMIN viewing without a filter); otherwise it is the branch the report is
 * scoped to and {@code branchName} is populated.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DashboardDto(
        // Date context
        LocalDate reportDate,
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,

        // --- Stat cards (10) ---
        DashboardStatCardDto todaySales,
        DashboardStatCardDto onlineSales,
        DashboardStatCardDto posSales,
        DashboardStatCardDto pendingOrders,
        DashboardStatCardDto lowStockProducts,
        DashboardStatCardDto expiringLots,
        DashboardStatCardDto todayTransactions,
        DashboardStatCardDto avgOrderValue,
        DashboardStatCardDto totalProducts,
        DashboardStatCardDto totalSuppliers,

        // --- Detail lists ---
        List<TopProductDto> topProducts,
        List<SalesByHourDto> salesByHour,
        List<SalesByMethodDto> salesByMethod,

        // --- Trends vs previous period ---
        BigDecimal salesTrendPercentage,
        BigDecimal transactionsTrendPercentage,
        BigDecimal avgOrderTrendPercentage
) {
}
