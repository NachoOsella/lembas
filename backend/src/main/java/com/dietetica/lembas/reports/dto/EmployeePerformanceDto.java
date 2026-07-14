package com.dietetica.lembas.reports.dto;

import java.math.BigDecimal;

/**
 * Operational activity attributed to one internal user during a report period.
 */
public record EmployeePerformanceDto(
        Long employeeId,
        String employeeName,
        String role,
        long posSalesCount,
        BigDecimal posRevenue,
        BigDecimal averageTicket,
        long cashSessionsOpened,
        long cashSessionsClosed,
        BigDecimal cashDifferenceAbsolute
) {
}
