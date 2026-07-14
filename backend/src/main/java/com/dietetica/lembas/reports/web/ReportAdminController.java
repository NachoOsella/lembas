package com.dietetica.lembas.reports.web;

import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.reports.dto.CashReportDto;
import com.dietetica.lembas.reports.dto.CashSessionHistoryDto;
import com.dietetica.lembas.reports.dto.DashboardDto;
import com.dietetica.lembas.reports.dto.InventoryReportDto;
import com.dietetica.lembas.reports.dto.SalesReportDto;
import com.dietetica.lembas.reports.dto.SuppliersReportDto;
import com.dietetica.lembas.reports.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * REST endpoints that power the operational dashboard, the cash session
 * history, and the dedicated report pages (Sales, Inventory, Suppliers).
 *
 * <p>All endpoints require an authenticated internal user (ADMIN, MANAGER or
 * EMPLOYEE). The branch scope is resolved inside the service so callers do
 * not have to repeat the role-based policy.</p>
 */
@RestController
@RequestMapping("/api/admin/reports")
public class ReportAdminController {

    private final ReportService reportService;

    public ReportAdminController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Operational dashboard payload for a single date.
     *
     * @param date     target report date; when omitted defaults to today
     * @param branchId optional branch filter (ADMIN only); null = consolidated
     */
    @GetMapping("/dashboard")
    public DashboardDto getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long branchId
    ) {
        return reportService.getDashboard(date, branchId);
    }

    /**
     * Paginated, filterable history of cash sessions.
     *
     * <p>All filters are optional; when omitted the list is the most recent
     * sessions across the user's branch scope.</p>
     */
    @GetMapping("/cash-sessions")
    public CashSessionHistoryDto getCashSessionHistory(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long openedBy,
            @RequestParam(required = false) Long closedBy,
            @RequestParam(required = false) CashSessionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "openedAt,desc") String sort
    ) {
        return reportService.getCashSessionHistory(
                branchId, from, to, openedBy, closedBy, status, page, size, sort);
    }

    /**
     * Full close-of-cash report for a single session.
     *
     * @param id cash session id
     */
    @GetMapping("/cash-session/{id}")
    public CashReportDto getCashReport(@PathVariable Long id) {
        return reportService.getCashReport(id);
    }

    /**
     * Dedicated sales report (Reportes / Ventas). Aggregates KPIs, daily
     * sales series, payment-method and category breakdowns, and the top 10
     * best-selling products in the requested window.
     */
    @GetMapping("/sales")
    public SalesReportDto getSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long branchId
    ) {
        return reportService.getSalesReport(from, to, branchId);
    }

    /**
     * Dedicated inventory report (Reportes / Inventario). Always runs
     * against the full catalog and returns the stock value per category,
     * the expiring-lots distribution by month, the top products by stock
     * value and the current low-stock list.
     */
    @GetMapping("/inventory")
    public InventoryReportDto getInventoryReport(
            @RequestParam(required = false) Long branchId
    ) {
        return reportService.getInventoryReport(branchId);
    }

    /**
     * Dedicated suppliers report (Reportes / Proveedores). Surfaces KPIs,
     * monthly purchase totals, top suppliers by volume and the lead time
     * ranking per supplier for the requested window.
     */
    @GetMapping("/suppliers")
    public SuppliersReportDto getSuppliersReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.getSuppliersReport(from, to);
    }
}
