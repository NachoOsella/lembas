package com.dietetica.lembas.reports.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.reports.dto.CashOverviewDto;
import com.dietetica.lembas.reports.dto.CashReportDto;
import com.dietetica.lembas.reports.dto.CashSessionHistoryDto;
import com.dietetica.lembas.reports.dto.CashSessionSummaryDto;
import com.dietetica.lembas.reports.dto.DashboardDto;
import com.dietetica.lembas.reports.dto.DashboardStatCardDto;
import com.dietetica.lembas.reports.dto.EmployeePerformanceDto;
import com.dietetica.lembas.reports.dto.EmployeeReportDto;
import com.dietetica.lembas.reports.dto.InventoryReportDto;
import com.dietetica.lembas.reports.dto.ReportBreakdownDto;
import com.dietetica.lembas.reports.dto.ReportKpiDto;
import com.dietetica.lembas.reports.dto.ReportSeriesPointDto;
import com.dietetica.lembas.reports.dto.ReportTopRowDto;
import com.dietetica.lembas.reports.dto.SalesByHourDto;
import com.dietetica.lembas.reports.dto.SalesByMethodDto;
import com.dietetica.lembas.reports.dto.SalesReportDto;
import com.dietetica.lembas.reports.dto.SuppliersReportDto;
import com.dietetica.lembas.reports.dto.TopProductDto;
import com.dietetica.lembas.reports.repository.ReportQueryRepository;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use cases for the operational dashboard and the cash session history
 * (S4-US04, S4-US05).
 *
 * <p>Branch resolution follows the same pattern as {@code CashService}:
 * ADMIN can target any branch by passing the {@code branchId} query
 * parameter (or omit it to consolidate every branch), while
 * MANAGER/EMPLOYEE are forced to the branch they are assigned to.</p>
 */
@Service
public class ReportService {

    private static final ZoneId REPORT_ZONE = ReportQueryRepository.REPORT_ZONE;

    /** Error codes used by the reports module; documented in {@code docs/05-api/error-handling.md}. */
    public static final String CODE_CASH_SESSION_NOT_FOUND = "CASH_SESSION_NOT_FOUND";

    public static final String CODE_BRANCH_NOT_FOUND = "BRANCH_NOT_FOUND";
    public static final String CODE_CASH_BRANCH_REQUIRED = "CASH_BRANCH_REQUIRED";
    public static final String CODE_INVALID_USER_BRANCH = "INVALID_USER_BRANCH";
    public static final String CODE_ACCESS_DENIED = "ACCESS_DENIED";

    private static final int DASHBOARD_TOP_PRODUCTS_LIMIT = 10;
    private static final int DASHBOARD_EXPIRING_HORIZON_DAYS = 30;
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    /** Sentinel used when no {@code from} date filter is provided. */
    private static final OffsetDateTime FAR_PAST = OffsetDateTime.of(1, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    /** Sentinel used when no {@code to} date filter is provided. */
    private static final OffsetDateTime FAR_FUTURE = OffsetDateTime.of(9999, 12, 31, 23, 59, 59, 0, ZoneOffset.UTC);

    private final ReportQueryRepository reportRepository;
    private final SecurityContextHelper securityContextHelper;
    private final BranchQuery branchQuery;
    private final CashService cashService;

    public ReportService(
            ReportQueryRepository reportRepository,
            SecurityContextHelper securityContextHelper,
            BranchQuery branchQuery,
            CashService cashService) {
        this.reportRepository = reportRepository;
        this.securityContextHelper = securityContextHelper;
        this.branchQuery = branchQuery;
        this.cashService = cashService;
    }

    // ---------------------------------------------------------------------------
    // Dashboard
    // ---------------------------------------------------------------------------

    /**
     * Builds the operational dashboard payload for the requested date and
     * branch scope.
     *
     * @param date      target report date; {@code null} falls back to today
     * @param branchId  optional branch filter (ADMIN only); {@code null} means
     *                  consolidated for ADMIN or "own branch" for MANAGER/EMPLOYEE
     * @return the fully populated dashboard DTO
     */
    @Transactional(readOnly = true)
    public DashboardDto getDashboard(LocalDate date, Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);

        LocalDate reportDate = date != null ? date : LocalDate.now(REPORT_ZONE);
        OffsetDateTime start = reportDate.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = start.plusDays(1);

        // Current-period aggregations
        BigDecimal[] totalAndAvg = reportRepository.totalAndAverageRevenue(start, end, effectiveBranchId);
        BigDecimal totalRevenue = totalAndAvg[0];
        BigDecimal avgOrderValue = totalAndAvg[1];
        long orderCount = reportRepository.countConfirmedOrders(start, end, effectiveBranchId);
        long pendingOrders = reportRepository.countPendingOrders(effectiveBranchId);
        long lowStock = reportRepository.lowStockProducts(effectiveBranchId).size();
        long expiringLots = reportRepository
                .expiringLots(DASHBOARD_EXPIRING_HORIZON_DAYS, effectiveBranchId)
                .size();
        long activeProducts = reportRepository.countActiveProducts();
        long activeSuppliers = reportRepository.countActiveSuppliers();

        // Revenue by type
        BigDecimal onlineRevenue = BigDecimal.ZERO;
        BigDecimal posRevenue = BigDecimal.ZERO;
        for (Object[] row : reportRepository.revenueByType(start, end, effectiveBranchId)) {
            String type = row[0] == null ? "" : row[0].toString();
            BigDecimal sum = toBigDecimal(row[2]);
            if ("ONLINE".equals(type)) {
                onlineRevenue = sum;
            } else if ("POS".equals(type)) {
                posRevenue = sum;
            }
        }

        // Trends vs previous period
        OffsetDateTime prevStart = start.minusDays(1);
        OffsetDateTime prevEnd = start;
        BigDecimal[] prevTotalAndAvg = reportRepository.totalAndAverageRevenue(prevStart, prevEnd, effectiveBranchId);
        long prevCount = reportRepository.countConfirmedOrders(prevStart, prevEnd, effectiveBranchId);

        List<TopProductDto> topProducts =
                reportRepository.topProducts(start, end, effectiveBranchId, DASHBOARD_TOP_PRODUCTS_LIMIT);
        List<SalesByHourDto> salesByHour = reportRepository.salesByHour(reportDate, effectiveBranchId);
        List<SalesByMethodDto> salesByMethod = reportRepository.salesByMethod(start, end, effectiveBranchId);

        return new DashboardDto(
                reportDate,
                effectiveBranchId,
                branchName,
                OffsetDateTime.now(),
                buildStatCard(
                        "Ventas del dia",
                        formatCurrency(totalRevenue),
                        "Total facturado en el dia",
                        trend(totalRevenue, prevTotalAndAvg[0]),
                        percentageDiff(totalRevenue, prevTotalAndAvg[0]),
                        "pi pi-shopping-cart",
                        "SUCCESS",
                        "/admin/orders?status=PAID",
                        "Suma de pedidos confirmados (PAID o posteriores) pagados en la fecha."),
                buildStatCard(
                        "Ventas online",
                        formatCurrency(onlineRevenue),
                        "Canal online del dia",
                        trend(onlineRevenue, BigDecimal.ZERO),
                        null,
                        "pi pi-globe",
                        "INFO",
                        "/admin/orders?type=ONLINE",
                        "Pedidos ONLINE pagados en la fecha."),
                buildStatCard(
                        "Ventas POS",
                        formatCurrency(posRevenue),
                        "Punto de venta del dia",
                        trend(posRevenue, BigDecimal.ZERO),
                        null,
                        "pi pi-shopping-bag",
                        "INFO",
                        "/admin/orders?type=POS",
                        "Pedidos cobrados en el local (POS) en la fecha."),
                buildStatCard(
                        "Pedidos pendientes",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(pendingOrders),
                        "Requieren atencion del equipo",
                        "FLAT",
                        null,
                        "pi pi-clock",
                        "WARNING",
                        "/admin/orders?status=PENDING",
                        "Pedidos ONLINE pendientes de pago, preparacion o retiro."),
                buildStatCard(
                        "Stock bajo",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(lowStock),
                        "Productos bajo el minimo",
                        lowStock > 0 ? "UP" : "FLAT",
                        null,
                        "pi pi-exclamation-triangle",
                        lowStock > 0 ? "DANGER" : "NEUTRAL",
                        "/admin/inventory",
                        "Productos activos con stock disponible menor al minimo configurado."),
                buildStatCard(
                        "Lotes por vencer",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(expiringLots),
                        "Proximos 30 dias",
                        expiringLots > 0 ? "UP" : "FLAT",
                        null,
                        "pi pi-calendar-times",
                        expiringLots > 0 ? "WARNING" : "NEUTRAL",
                        "/admin/inventory",
                        "Lotes con fecha de vencimiento dentro de los proximos 30 dias."),
                buildStatCard(
                        "Transacciones",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(orderCount),
                        "Pedidos confirmados",
                        trend(BigDecimal.valueOf(orderCount), BigDecimal.valueOf(prevCount)),
                        percentageDiff(BigDecimal.valueOf(orderCount), BigDecimal.valueOf(prevCount)),
                        "pi pi-receipt",
                        "NEUTRAL",
                        "/admin/orders",
                        "Cantidad de pedidos confirmados en la fecha."),
                buildStatCard(
                        "Ticket promedio",
                        formatCurrency(avgOrderValue),
                        "Promedio por pedido",
                        trend(avgOrderValue, prevTotalAndAvg[1]),
                        percentageDiff(avgOrderValue, prevTotalAndAvg[1]),
                        "pi pi-chart-line",
                        "INFO",
                        null,
                        "Promedio de total de los pedidos confirmados en la fecha."),
                buildStatCard(
                        "Productos activos",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(activeProducts),
                        "Catalogo disponible",
                        "FLAT",
                        null,
                        "pi pi-box",
                        "NEUTRAL",
                        "/admin/products",
                        "Total de productos activos en el catalogo."),
                buildStatCard(
                        "Proveedores activos",
                        NumberFormat.getInstance(new Locale("es", "AR")).format(activeSuppliers),
                        "Cartera vigente",
                        "FLAT",
                        null,
                        "pi pi-truck",
                        "NEUTRAL",
                        "/admin/suppliers",
                        "Total de proveedores activos."),
                topProducts,
                salesByHour,
                salesByMethod,
                percentageDiff(totalRevenue, prevTotalAndAvg[0]),
                percentageDiff(BigDecimal.valueOf(orderCount), BigDecimal.valueOf(prevCount)),
                percentageDiff(avgOrderValue, prevTotalAndAvg[1]));
    }

    // ---------------------------------------------------------------------------
    // Cash overview
    // ---------------------------------------------------------------------------

    /** Default date window for the cash overview when no dates are supplied. */
    private static final int DEFAULT_CASH_WINDOW_DAYS = 30;

    /** Number of discrepancy sessions shown in the operational queue. */
    private static final int CASH_DISCREPANCY_LIMIT = 10;

    /**
     * Builds an operational cash dashboard for a date range and branch scope.
     * Amounts remain numeric in the response; the frontend owns formatting and labels.
     */
    @Transactional(readOnly = true)
    public CashOverviewDto getCashOverview(LocalDate from, LocalDate to, Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);

        LocalDate effectiveTo = to != null ? to : LocalDate.now(REPORT_ZONE);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(DEFAULT_CASH_WINDOW_DAYS - 1L);
        if (effectiveFrom.isAfter(effectiveTo)) {
            effectiveFrom = effectiveTo;
        }

        OffsetDateTime start = effectiveFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = effectiveTo.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        Object[] totals = reportRepository.cashOverviewTotals(start, end, effectiveBranchId);

        return new CashOverviewDto(
                effectiveFrom,
                effectiveTo,
                effectiveBranchId,
                branchName,
                OffsetDateTime.now(),
                ((Number) totals[0]).longValue(),
                ((Number) totals[1]).longValue(),
                ((Number) totals[2]).longValue(),
                ((Number) totals[3]).longValue(),
                toBigDecimal(totals[4]).setScale(2, RoundingMode.HALF_UP),
                toBigDecimal(totals[5]).setScale(2, RoundingMode.HALF_UP),
                toBigDecimal(totals[6]).setScale(2, RoundingMode.HALF_UP),
                toBigDecimal(totals[7]).setScale(2, RoundingMode.HALF_UP),
                reportRepository.cashOverviewDailySeries(effectiveFrom, effectiveTo, effectiveBranchId),
                reportRepository.cashOverviewPaymentMethods(start, end, effectiveBranchId),
                reportRepository.cashSessionsWithDiscrepancy(effectiveBranchId, start, end, CASH_DISCREPANCY_LIMIT));
    }

    // ---------------------------------------------------------------------------
    // Cash report
    // ---------------------------------------------------------------------------

    /**
     * Returns the full close-of-cash report for a single session.
     *
     * <p>Builds on top of {@link CashService#getSessionById(Long)} so the
     * session metadata, totals-by-method and the unified entries timeline
     * come from the existing module. The report adds POS-specific aggregates
     * (transaction count, POS order count, POS revenue) and a pre-filtered
     * list of manual movements so the FE can render the manual cash
     * movements table without re-filtering the entries timeline client-side.</p>
     *
     * @param sessionId target session id
     * @return the report DTO
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when the session does not exist
     */
    @Transactional(readOnly = true)
    public CashReportDto getCashReport(Long sessionId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        CashSession session = reportRepository.findSessionById(sessionId);
        if (session == null) {
            throw new DomainException(CODE_CASH_SESSION_NOT_FOUND, HttpStatus.NOT_FOUND, "Cash session not found");
        }

        CashSessionDto base = cashService.getSessionById(sessionId);
        long totalTransactions = reportRepository.countApprovedPayments(sessionId);
        long posOrdersCount = reportRepository.countPosOrdersForSession(sessionId);
        BigDecimal totalPosRevenue = reportRepository.totalPosRevenueForSession(sessionId);
        List<CashMovementDto> manualMovements = reportRepository.manualMovementsForSession(sessionId);

        return new CashReportDto(
                base.id(),
                base.branchId(),
                base.branchName(),
                base.openedByUserId(),
                base.openedByUserName(),
                base.closedByUserId(),
                base.closedByUserName(),
                base.openedAt(),
                base.closedAt(),
                base.status(),
                base.openingCashAmount(),
                base.expectedCashAmount(),
                base.countedCashAmount(),
                base.cashDifferenceAmount(),
                base.cashDifferenceReason(),
                base.openingNotes(),
                base.closingNotes(),
                base.totalsByMethod() == null ? CashTotalsByMethodDto.empty() : base.totalsByMethod(),
                totalTransactions,
                posOrdersCount,
                totalPosRevenue,
                base.entries() == null ? List.of() : base.entries(),
                manualMovements,
                OffsetDateTime.now());
    }

    // ---------------------------------------------------------------------------
    // Sales report (Reportes / Ventas)
    // ---------------------------------------------------------------------------

    /**
     * Default window length for the sales report when the caller does not
     * provide explicit from/to dates.
     */
    private static final int DEFAULT_SALES_WINDOW_DAYS = 30;

    /**
     * Default window length for the suppliers report.
     */
    private static final int DEFAULT_SUPPLIERS_WINDOW_DAYS = 90;

    /**
     * How many months ahead the inventory report looks for expiring lots.
     */
    private static final int INVENTORY_EXPIRATION_HORIZON_MONTHS = 6;

    /** Top-N limits for the dedicated report pages. */
    private static final int REPORT_TOP_LIMIT = 10;

    /**
     * Builds the sales report payload for the requested window. Defaults
     * to the trailing 30 days when no dates are provided.
     *
     * @param from     start date (inclusive)
     * @param to       end date (inclusive)
     * @param branchId optional branch filter (ADMIN only)
     * @return the fully populated sales report DTO
     */
    @Transactional(readOnly = true)
    public SalesReportDto getSalesReport(LocalDate from, LocalDate to, Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);

        LocalDate effectiveTo = to != null ? to : LocalDate.now(REPORT_ZONE);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(DEFAULT_SALES_WINDOW_DAYS - 1L);
        if (effectiveFrom.isAfter(effectiveTo)) {
            effectiveFrom = effectiveTo;
        }

        OffsetDateTime start = effectiveFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = effectiveTo.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();

        // -- KPIs ---------------------------------------------------------
        BigDecimal[] totalAndAvg = reportRepository.totalAndAverageRevenue(start, end, effectiveBranchId);
        BigDecimal totalRevenue = totalAndAvg[0];
        BigDecimal avgOrderValue = totalAndAvg[1];
        long orderCount = reportRepository.countConfirmedOrders(start, end, effectiveBranchId);
        long cancelled = reportRepository.countCancelledOrders(start, end, effectiveBranchId);
        BigDecimal costOfGoodsSold = reportRepository.costOfGoodsSold(start, end, effectiveBranchId);
        BigDecimal grossProfit = totalRevenue.subtract(costOfGoodsSold);
        BigDecimal grossMargin = totalRevenue.signum() == 0
                ? BigDecimal.ZERO
                : grossProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 1, RoundingMode.HALF_UP);

        // Trend vs the previous period of equal length.
        long days = java.time.temporal.ChronoUnit.DAYS.between(effectiveFrom, effectiveTo) + 1;
        LocalDate prevFrom = effectiveFrom.minusDays(days);
        LocalDate prevTo = effectiveFrom.minusDays(1);
        OffsetDateTime prevStart = prevFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime prevEnd = effectiveFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        BigDecimal[] prevTotalAndAvg = reportRepository.totalAndAverageRevenue(prevStart, prevEnd, effectiveBranchId);
        BigDecimal prevRevenue = prevTotalAndAvg[0];
        long prevCount = reportRepository.countConfirmedOrders(prevStart, prevEnd, effectiveBranchId);

        List<ReportKpiDto> kpis = new ArrayList<>();
        kpis.add(new ReportKpiDto(
                "Facturacion del periodo",
                formatCurrency(totalRevenue),
                "Total confirmado en el rango",
                "pi pi-shopping-cart",
                "SUCCESS",
                trend(totalRevenue, prevRevenue),
                percentageDiff(totalRevenue, prevRevenue)));
        kpis.add(new ReportKpiDto(
                "Transacciones",
                NumberFormat.getInstance(new Locale("es", "AR")).format(orderCount),
                "Pedidos confirmados",
                "pi pi-receipt",
                "INFO",
                trend(BigDecimal.valueOf(orderCount), BigDecimal.valueOf(prevCount)),
                percentageDiff(BigDecimal.valueOf(orderCount), BigDecimal.valueOf(prevCount))));
        kpis.add(new ReportKpiDto(
                "Ticket promedio",
                formatCurrency(avgOrderValue),
                "Promedio por pedido",
                "pi pi-chart-line",
                "NEUTRAL",
                trend(avgOrderValue, prevTotalAndAvg[1]),
                percentageDiff(avgOrderValue, prevTotalAndAvg[1])));
        kpis.add(new ReportKpiDto(
                "Margen bruto",
                formatCurrency(grossProfit),
                grossMargin.toPlainString() + "% sobre facturacion",
                "pi pi-percentage",
                grossProfit.signum() >= 0 ? "SUCCESS" : "DANGER",
                "FLAT",
                null));
        long resolvedOrders = orderCount + cancelled;
        BigDecimal cancellationRate = resolvedOrders == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(cancelled)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(resolvedOrders), 1, RoundingMode.HALF_UP);
        kpis.add(new ReportKpiDto(
                "Cancelaciones",
                NumberFormat.getInstance(new Locale("es", "AR")).format(cancelled),
                cancellationRate.toPlainString() + "% de pedidos resueltos",
                "pi pi-times-circle",
                cancelled > 0 ? "WARNING" : "NEUTRAL",
                "FLAT",
                null));

        // -- Daily series -------------------------------------------------
        List<ReportSeriesPointDto> series = new ArrayList<>();
        // Re-shape the dashboard hourly series into daily buckets for the FE.
        java.util.Map<LocalDate, BigDecimal> revenueByDay = new java.util.HashMap<>();
        for (Object[] row : reportRepository.salesByDay(effectiveFrom, effectiveTo, effectiveBranchId)) {
            LocalDate date = toLocalDate(row[0]);
            revenueByDay.put(date, toBigDecimal(row[1]).setScale(2, RoundingMode.HALF_UP));
        }
        for (LocalDate d = effectiveFrom; !d.isAfter(effectiveTo); d = d.plusDays(1)) {
            BigDecimal value = revenueByDay.getOrDefault(d, BigDecimal.ZERO.setScale(2));
            series.add(new ReportSeriesPointDto(
                    d, String.format("%02d/%02d", d.getDayOfMonth(), d.getMonthValue()), value, null));
        }

        // -- Payment methods ---------------------------------------------
        List<SalesByMethodDto> methods = reportRepository.salesByMethod(start, end, effectiveBranchId);
        List<ReportBreakdownDto> byMethod = new ArrayList<>();
        for (SalesByMethodDto m : methods) {
            byMethod.add(new ReportBreakdownDto(
                    m.method(),
                    m.methodLabel(),
                    m.totalAmount(),
                    BigDecimal.valueOf(m.transactionCount()),
                    m.percentage()));
        }

        // -- Categories ---------------------------------------------------
        List<ReportBreakdownDto> byCategory = new ArrayList<>();
        for (Object[] row : reportRepository.salesByCategory(start, end, effectiveBranchId)) {
            Long categoryId = row[0] == null ? null : ((Number) row[0]).longValue();
            String categoryName = (String) row[1];
            BigDecimal amount = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
            long count = ((Number) row[3]).longValue();
            byCategory.add(new ReportBreakdownDto(
                    String.valueOf(categoryId), categoryName, amount, BigDecimal.valueOf(count), BigDecimal.ZERO));
        }
        // Recompute percentages now that we know the grand total.
        BigDecimal totalByCategory =
                byCategory.stream().map(ReportBreakdownDto::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalByCategory.signum() > 0) {
            byCategory = byCategory.stream()
                    .map(item -> new ReportBreakdownDto(
                            item.key(),
                            item.label(),
                            item.amount(),
                            item.count(),
                            item.amount()
                                    .multiply(BigDecimal.valueOf(100))
                                    .divide(totalByCategory, 2, RoundingMode.HALF_UP)))
                    .toList();
        }

        // -- Top products ------------------------------------------------
        List<TopProductDto> top = reportRepository.topProducts(start, end, effectiveBranchId, REPORT_TOP_LIMIT);
        List<ReportTopRowDto> topProducts = new ArrayList<>();
        for (TopProductDto t : top) {
            topProducts.add(new ReportTopRowDto(
                    t.productId(),
                    t.productName(),
                    t.categoryName(),
                    formatCurrency(t.totalRevenue()),
                    NumberFormat.getInstance(new Locale("es", "AR")).format(t.quantitySold()) + " u.",
                    null));
        }

        return new SalesReportDto(
                effectiveFrom,
                effectiveTo,
                effectiveBranchId,
                branchName,
                OffsetDateTime.now(),
                kpis,
                series,
                byMethod,
                byCategory,
                topProducts);
    }

    // ---------------------------------------------------------------------------
    // Inventory report (Reportes / Inventario)
    // ---------------------------------------------------------------------------

    /**
     * Builds the inventory report payload. Always runs against the full
     * catalog and returns the per-category stock value breakdown, the
     * expiring-lots distribution by month and the top products by stock
     * value.
     *
     * @param branchId optional branch filter (ADMIN only)
     * @return the fully populated inventory report DTO
     */
    @Transactional(readOnly = true)
    public InventoryReportDto getInventoryReport(Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);

        BigDecimal totalStockValue =
                reportRepository.totalStockValue(effectiveBranchId).setScale(2, RoundingMode.HALF_UP);
        BigDecimal expiringStockValue = reportRepository
                .expiringStockValue(DASHBOARD_EXPIRING_HORIZON_DAYS, effectiveBranchId)
                .setScale(2, RoundingMode.HALF_UP);
        long lowStock = reportRepository.lowStockProducts(effectiveBranchId).size();
        long expired = reportRepository.countExpiredLots(effectiveBranchId);

        List<ReportKpiDto> kpis = new ArrayList<>();
        kpis.add(new ReportKpiDto(
                "Stock valorizado",
                formatCurrency(totalStockValue),
                "Capital inmovilizado en lotes activos",
                "pi pi-box",
                "SUCCESS",
                "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Capital por vencer",
                formatCurrency(expiringStockValue),
                "Costo del stock que vence en los proximos 30 dias",
                "pi pi-money-bill",
                expiringStockValue.signum() > 0 ? "WARNING" : "NEUTRAL",
                "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Stock bajo",
                NumberFormat.getInstance(new Locale("es", "AR")).format(lowStock),
                "Productos bajo el minimo",
                "pi pi-exclamation-triangle",
                lowStock > 0 ? "DANGER" : "NEUTRAL",
                lowStock > 0 ? "UP" : "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Lotes vencidos",
                NumberFormat.getInstance(new Locale("es", "AR")).format(expired),
                "Stock activo que requiere retiro inmediato",
                "pi pi-calendar-times",
                expired > 0 ? "DANGER" : "NEUTRAL",
                expired > 0 ? "UP" : "FLAT",
                null));

        // -- Stock by category -------------------------------------------
        List<ReportBreakdownDto> stockByCategory = new ArrayList<>();
        BigDecimal grandTotal = BigDecimal.ZERO;
        List<Object[]> categoryRows = reportRepository.stockValueByCategory(effectiveBranchId);
        for (Object[] row : categoryRows) {
            Long categoryId = row[0] == null ? null : ((Number) row[0]).longValue();
            String name = (String) row[1];
            BigDecimal value = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
            BigDecimal units = toBigDecimal(row[3]);
            stockByCategory.add(new ReportBreakdownDto(
                    String.valueOf(categoryId), name, value, units.stripTrailingZeros(), BigDecimal.ZERO));
            grandTotal = grandTotal.add(value);
        }
        if (grandTotal.signum() > 0) {
            final BigDecimal finalTotal = grandTotal;
            stockByCategory = stockByCategory.stream()
                    .map(item -> new ReportBreakdownDto(
                            item.key(),
                            item.label(),
                            item.amount(),
                            item.count(),
                            item.amount()
                                    .multiply(BigDecimal.valueOf(100))
                                    .divide(finalTotal, 2, RoundingMode.HALF_UP)))
                    .toList();
        }

        // -- Expiring by month -------------------------------------------
        List<ReportSeriesPointDto> expiringByMonth = new ArrayList<>();
        for (Object[] row :
                reportRepository.expiringLotsByMonth(INVENTORY_EXPIRATION_HORIZON_MONTHS, effectiveBranchId)) {
            LocalDate month = toLocalDate(row[0]);
            long lotCount = ((Number) row[1]).longValue();
            BigDecimal units = toBigDecimal(row[2]).stripTrailingZeros();
            String label = month.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, new Locale("es", "AR"));
            label = label.substring(0, 1).toUpperCase() + label.substring(1);
            expiringByMonth.add(new ReportSeriesPointDto(month, label, BigDecimal.valueOf(lotCount), units));
        }

        // -- Top by value ------------------------------------------------
        List<ReportTopRowDto> topByValue = new ArrayList<>();
        for (Object[] row : reportRepository.topStockByValue(effectiveBranchId, REPORT_TOP_LIMIT)) {
            Long productId = ((Number) row[0]).longValue();
            String productName = (String) row[1];
            String categoryName = (String) row[2];
            BigDecimal value = toBigDecimal(row[3]).setScale(2, RoundingMode.HALF_UP);
            BigDecimal units = toBigDecimal(row[4]);
            topByValue.add(new ReportTopRowDto(
                    productId,
                    productName,
                    categoryName,
                    formatCurrency(value),
                    units.stripTrailingZeros().toPlainString() + " u.",
                    null));
        }

        // -- Low stock list ----------------------------------------------
        List<ReportTopRowDto> lowStockList = new ArrayList<>();
        for (Object[] row : reportRepository.lowStockProducts(effectiveBranchId)) {
            Long productId = ((Number) row[0]).longValue();
            String productName = (String) row[1];
            BigDecimal stock = toBigDecimal(row[2]);
            Integer min = ((Number) row[3]).intValue();
            String branchLabel = row.length > 5 ? (String) row[5] : null;
            String badge = min != null && stock.signum() == 0 ? "Sin stock" : "Bajo minimo";
            lowStockList.add(new ReportTopRowDto(
                    productId,
                    effectiveBranchId == null && branchLabel != null ? productName + " - " + branchLabel : productName,
                    "Stock actual: " + stock.stripTrailingZeros().toPlainString() + " u. - Minimo: "
                            + (min == null ? "-" : min.toString()) + " u.",
                    NumberFormat.getInstance(new Locale("es", "AR")).format(stock) + " u.",
                    "Min. " + (min == null ? "-" : min.toString()) + " u.",
                    badge));
        }

        return new InventoryReportDto(
                effectiveBranchId,
                branchName,
                OffsetDateTime.now(),
                kpis,
                stockByCategory,
                expiringByMonth,
                topByValue,
                lowStockList);
    }

    // ---------------------------------------------------------------------------
    // Suppliers report (Reportes / Proveedores)
    // ---------------------------------------------------------------------------

    /**
     * Builds the suppliers report payload for the requested window.
     * Defaults to the trailing 90 days when no dates are provided.
     *
     * @param from start date (inclusive)
     * @param to   end date (inclusive)
     * @return the fully populated suppliers report DTO
     */
    @Transactional(readOnly = true)
    public SuppliersReportDto getSuppliersReport(LocalDate from, LocalDate to, Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);

        LocalDate effectiveTo = to != null ? to : LocalDate.now(REPORT_ZONE);
        LocalDate effectiveFrom = from != null ? from : effectiveTo.minusDays(DEFAULT_SUPPLIERS_WINDOW_DAYS - 1L);
        if (effectiveFrom.isAfter(effectiveTo)) {
            effectiveFrom = effectiveTo;
        }

        OffsetDateTime start = effectiveFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = effectiveTo.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();

        Object[] aggregates = reportRepository.purchaseAggregates(start, end, effectiveBranchId);
        BigDecimal totalPurchases = toBigDecimal(aggregates[0]).setScale(2, RoundingMode.HALF_UP);
        long receiptCount = ((Number) aggregates[1]).longValue();
        BigDecimal avgLeadDays = toBigDecimal(aggregates[2]).setScale(2, RoundingMode.HALF_UP);
        BigDecimal onTimePercentage = toBigDecimal(aggregates[3]).setScale(1, RoundingMode.HALF_UP);

        List<ReportKpiDto> kpis = new ArrayList<>();
        kpis.add(new ReportKpiDto(
                "Compras del periodo",
                formatCurrency(totalPurchases),
                "Costo real de mercaderia recibida",
                "pi pi-shopping-bag",
                "SUCCESS",
                "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Recepciones",
                NumberFormat.getInstance(new Locale("es", "AR")).format(receiptCount),
                "Recepciones confirmadas en el periodo",
                "pi pi-file",
                "INFO",
                "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Lead time promedio",
                avgLeadDays.setScale(1, RoundingMode.HALF_UP).toPlainString() + " d.",
                "Entre emision y recepcion final",
                "pi pi-stopwatch",
                "WARNING",
                "FLAT",
                null));
        kpis.add(new ReportKpiDto(
                "Entregas a tiempo",
                onTimePercentage.toPlainString() + "%",
                "Ordenes completadas dentro de la fecha prevista",
                "pi pi-calendar-clock",
                onTimePercentage.compareTo(BigDecimal.valueOf(80)) >= 0 ? "SUCCESS" : "WARNING",
                "FLAT",
                null));

        // -- Purchases by month ------------------------------------------
        List<ReportSeriesPointDto> purchasesByMonth = new ArrayList<>();
        for (Object[] row : reportRepository.purchasesByMonth(start, end, effectiveBranchId)) {
            LocalDate month = toLocalDate(row[0]);
            BigDecimal total = toBigDecimal(row[1]).setScale(2, RoundingMode.HALF_UP);
            long orders = toBigDecimal(row[2]).longValue();
            String label = month.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, new Locale("es", "AR"));
            label = label.substring(0, 1).toUpperCase() + label.substring(1);
            purchasesByMonth.add(new ReportSeriesPointDto(month, label, total, BigDecimal.valueOf(orders)));
        }

        // -- Top by volume -----------------------------------------------
        List<ReportTopRowDto> topByVolume = new ArrayList<>();
        for (Object[] row : reportRepository.topSuppliersByVolume(start, end, effectiveBranchId, REPORT_TOP_LIMIT)) {
            Long supplierId = ((Number) row[0]).longValue();
            String name = (String) row[1];
            BigDecimal total = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
            long orders = ((Number) row[3]).longValue();
            topByVolume.add(new ReportTopRowDto(
                    supplierId,
                    name,
                    null,
                    formatCurrency(total),
                    NumberFormat.getInstance(new Locale("es", "AR")).format(orders) + " ord.",
                    null));
        }

        // -- Lead time by supplier ---------------------------------------
        List<ReportTopRowDto> leadTime = new ArrayList<>();
        for (Object[] row : reportRepository.avgLeadTimeBySupplier(start, end, effectiveBranchId, REPORT_TOP_LIMIT)) {
            Long supplierId = ((Number) row[0]).longValue();
            String name = (String) row[1];
            BigDecimal days = toBigDecimal(row[2]).setScale(1, RoundingMode.HALF_UP);
            long orders = ((Number) row[3]).longValue();
            leadTime.add(new ReportTopRowDto(
                    supplierId,
                    name,
                    null,
                    days.toPlainString() + " d.",
                    NumberFormat.getInstance(new Locale("es", "AR")).format(orders) + " ord.",
                    null));
        }

        return new SuppliersReportDto(
                effectiveFrom,
                effectiveTo,
                effectiveBranchId,
                branchName,
                OffsetDateTime.now(),
                kpis,
                purchasesByMonth,
                topByVolume,
                leadTime);
    }

    // ---------------------------------------------------------------------------
    // Employee report
    // ---------------------------------------------------------------------------

    /**
     * Builds an employee-focused report from attributable POS sales and cash
     * sessions. Online orders are intentionally excluded because they do not
     * have a selling employee.
     */
    @Transactional(readOnly = true)
    public EmployeeReportDto getEmployeeReport(LocalDate from, LocalDate to, Long branchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        String branchName = effectiveBranchId == null
                ? null
                : branchQuery
                        .findById(effectiveBranchId)
                        .map(com.dietetica.lembas.shared.branch.model.Branch::getName)
                        .orElse(null);
        LocalDate effectiveFrom = from == null ? LocalDate.now(REPORT_ZONE).minusDays(29) : from;
        LocalDate effectiveTo = to == null ? LocalDate.now(REPORT_ZONE) : to;
        OffsetDateTime start = effectiveFrom.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = effectiveTo.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        Map<Long, EmployeeMetrics> metricsByEmployee = new HashMap<>();

        for (Object[] row : reportRepository.employeePosPerformance(start, end, effectiveBranchId)) {
            EmployeeMetrics metrics = metricsFor(metricsByEmployee, row);
            metrics.posSalesCount = toBigDecimal(row[4]).longValue();
            metrics.posRevenue = toBigDecimal(row[5]).setScale(2, RoundingMode.HALF_UP);
            metrics.averageTicket = toBigDecimal(row[6]).setScale(2, RoundingMode.HALF_UP);
        }
        for (Object[] row : reportRepository.employeeCashOpenPerformance(start, end, effectiveBranchId)) {
            metricsFor(metricsByEmployee, row).cashSessionsOpened =
                    toBigDecimal(row[4]).longValue();
        }
        for (Object[] row : reportRepository.employeeCashClosePerformance(start, end, effectiveBranchId)) {
            EmployeeMetrics metrics = metricsFor(metricsByEmployee, row);
            metrics.cashSessionsClosed = toBigDecimal(row[4]).longValue();
            metrics.cashDifferenceAbsolute = toBigDecimal(row[5]).setScale(2, RoundingMode.HALF_UP);
        }

        List<EmployeePerformanceDto> employees = metricsByEmployee.values().stream()
                .map(EmployeeMetrics::toDto)
                .sorted(Comparator.comparing(EmployeePerformanceDto::posRevenue)
                        .reversed()
                        .thenComparing(EmployeePerformanceDto::posSalesCount, Comparator.reverseOrder())
                        .thenComparing(EmployeePerformanceDto::employeeName))
                .toList();
        long posSalesCount = employees.stream()
                .mapToLong(EmployeePerformanceDto::posSalesCount)
                .sum();
        BigDecimal posRevenue =
                employees.stream().map(EmployeePerformanceDto::posRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cashDifferenceAbsolute = employees.stream()
                .map(EmployeePerformanceDto::cashDifferenceAbsolute)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long cashSessionsClosed = employees.stream()
                .mapToLong(EmployeePerformanceDto::cashSessionsClosed)
                .sum();

        List<ReportKpiDto> kpis = List.of(
                new ReportKpiDto(
                        "Operadores con actividad",
                        String.valueOf(employees.size()),
                        "Ventas POS o actividad de caja",
                        "pi pi-users",
                        "INFO",
                        null,
                        null),
                new ReportKpiDto(
                        "Facturacion POS",
                        formatCurrency(posRevenue),
                        NumberFormat.getInstance(new Locale("es", "AR")).format(posSalesCount) + " ventas",
                        "pi pi-shopping-bag",
                        "SUCCESS",
                        null,
                        null),
                new ReportKpiDto(
                        "Cierres de caja",
                        String.valueOf(cashSessionsClosed),
                        "Cierres realizados en el periodo",
                        "pi pi-wallet",
                        "NEUTRAL",
                        null,
                        null),
                new ReportKpiDto(
                        "Desvios absolutos",
                        formatCurrency(cashDifferenceAbsolute),
                        "Suma de diferencias de caja, sin compensarlas",
                        "pi pi-exclamation-triangle",
                        cashDifferenceAbsolute.signum() == 0 ? "SUCCESS" : "WARNING",
                        null,
                        null));

        return new EmployeeReportDto(
                effectiveFrom, effectiveTo, effectiveBranchId, branchName, OffsetDateTime.now(), kpis, employees);
    }

    private static EmployeeMetrics metricsFor(Map<Long, EmployeeMetrics> metricsByEmployee, Object[] row) {
        Long employeeId = ((Number) row[0]).longValue();
        return metricsByEmployee.computeIfAbsent(
                employeeId,
                ignored -> new EmployeeMetrics(
                        employeeId,
                        fullName((String) row[1], (String) row[2]),
                        row[3] == null ? "EMPLOYEE" : row[3].toString()));
    }

    private static String fullName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String name = (first + " " + last).trim();
        return name.isBlank() ? "Usuario interno" : name;
    }

    /** Mutable accumulator used only while merging independent report queries. */
    private static final class EmployeeMetrics {
        private final Long employeeId;
        private final String employeeName;
        private final String role;
        private long posSalesCount;
        private BigDecimal posRevenue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        private BigDecimal averageTicket = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        private long cashSessionsOpened;
        private long cashSessionsClosed;
        private BigDecimal cashDifferenceAbsolute = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        private EmployeeMetrics(Long employeeId, String employeeName, String role) {
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.role = role;
        }

        private EmployeePerformanceDto toDto() {
            return new EmployeePerformanceDto(
                    employeeId,
                    employeeName,
                    role,
                    posSalesCount,
                    posRevenue,
                    averageTicket,
                    cashSessionsOpened,
                    cashSessionsClosed,
                    cashDifferenceAbsolute);
        }
    }

    // ---------------------------------------------------------------------------
    // Cash session history
    // ---------------------------------------------------------------------------

    /**
     * Returns a paginated, filtered history of cash sessions.
     *
     * <p>{@code branchId} is resolved through the same rules as the
     * dashboard. {@code openedByUserId} and {@code closedByUserId} filter
     * the session by who opened or closed it. {@code status} defaults to
     * "all" when {@code null}; pass {@code OPEN} or {@code CLOSED} to
     * restrict.</p>
     */
    @Transactional(readOnly = true)
    public CashSessionHistoryDto getCashSessionHistory(
            Long branchId,
            LocalDate from,
            LocalDate to,
            Long openedByUserId,
            Long closedByUserId,
            CashSessionStatus status,
            int page,
            int size,
            String sort) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);

        int effectivePage = Math.max(page, 0);
        int effectiveSize = clampPageSize(size);
        OffsetDateTime fromTs =
                from == null ? FAR_PAST : from.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime toTs = to == null
                ? FAR_FUTURE
                : to.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();

        List<CashSessionSummaryDto> rows = reportRepository.cashSessionHistory(
                effectiveBranchId,
                fromTs,
                toTs,
                openedByUserId,
                closedByUserId,
                status,
                effectivePage * effectiveSize,
                effectiveSize,
                sort);
        long total = reportRepository.countCashSessionHistory(
                effectiveBranchId, fromTs, toTs, openedByUserId, closedByUserId, status);

        return new CashSessionHistoryDto(rows, total, effectivePage, effectiveSize);
    }

    // ---------------------------------------------------------------------------
    // Branch resolution (mirrors CashService)
    // ---------------------------------------------------------------------------

    /**
     * Resolves the target branch for an admin report call.
     *
     * <ul>
     *   <li>ADMIN may pass {@code branchId} to scope the report; when null,
     *       the response aggregates every branch.</li>
     *   <li>MANAGER/EMPLOYEE always get their assigned branch; the param is
     *       ignored.</li>
     * </ul>
     */
    private Long resolveBranchForUser(Long requestedBranchId, User user) {
        if (user.getRole() == Role.ADMIN) {
            if (requestedBranchId == null) {
                return null;
            }
            if (!branchQuery.existsActive(requestedBranchId)) {
                throw new DomainException(CODE_BRANCH_NOT_FOUND, HttpStatus.NOT_FOUND, "Branch not found or inactive");
            }
            return requestedBranchId;
        }
        if (user.getBranchId() == null) {
            throw new DomainException(CODE_INVALID_USER_BRANCH, HttpStatus.BAD_REQUEST, "User has no assigned branch");
        }
        return user.getBranchId();
    }

    private static int clampPageSize(int requested) {
        if (requested <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requested, MAX_PAGE_SIZE);
    }

    /** Rejects CUSTOMER users from the report endpoints. */
    private void ensureInternalUser(User user) {
        if (user == null || user.getRole() == Role.CUSTOMER) {
            throw new DomainException(
                    CODE_ACCESS_DENIED, HttpStatus.FORBIDDEN, "Only internal users can access reports");
        }
    }

    // ---------------------------------------------------------------------------
    // Formatting helpers
    // ---------------------------------------------------------------------------

    /** Formats a BigDecimal as ARS currency (es-AR locale), no fractional digits. */
    private static String formatCurrency(BigDecimal value) {
        if (value == null) {
            return formatCurrency(BigDecimal.ZERO);
        }
        NumberFormat fmt = NumberFormat.getCurrencyInstance(new Locale("es", "AR"));
        fmt.setMaximumFractionDigits(0);
        fmt.setMinimumFractionDigits(0);
        return fmt.format(value);
    }

    /**
     * Builds a single stat card with a consistent shape so the FE can render
     * each card with the same component.
     */
    private static DashboardStatCardDto buildStatCard(
            String label,
            String value,
            String subtitle,
            String trend,
            BigDecimal trendPercentage,
            String icon,
            String colorStyle,
            String link,
            String tooltip) {
        return new DashboardStatCardDto(
                label,
                value,
                subtitle,
                trend,
                trendPercentage == null ? null : trendPercentage.setScale(2, RoundingMode.HALF_UP),
                icon,
                colorStyle,
                link,
                tooltip);
    }

    /**
     * Returns the direction of the trend between two values.
     * {@code UP} when current > previous, {@code DOWN} when current < previous,
     * {@code FLAT} otherwise (including both being zero).
     */
    static String trend(BigDecimal current, BigDecimal previous) {
        BigDecimal c = current == null ? BigDecimal.ZERO : current;
        BigDecimal p = previous == null ? BigDecimal.ZERO : previous;
        int cmp = c.compareTo(p);
        if (cmp > 0) return "UP";
        if (cmp < 0) return "DOWN";
        return "FLAT";
    }

    /**
     * Computes the percentage difference between two values: {@code (current - previous) / previous * 100}.
     * Returns {@code null} when there is no previous value or the previous value is zero.
     */
    static BigDecimal percentageDiff(BigDecimal current, BigDecimal previous) {
        if (current == null) current = BigDecimal.ZERO;
        if (previous == null) previous = BigDecimal.ZERO;
        if (previous.signum() == 0) {
            return current.signum() == 0 ? null : BigDecimal.valueOf(100);
        }
        return current.subtract(previous).multiply(BigDecimal.valueOf(100)).divide(previous, 4, RoundingMode.HALF_UP);
    }

    /**
     * Coerces a query result value to BigDecimal. Mirrors the helper inside
     * the repository so the service can read raw {@link Object[]} rows
     * safely (Hibernate may return {@link BigDecimal}, {@link Number} or
     * {@code null}).
     */
    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    /** Normalizes date values returned by JPQL and PostgreSQL native queries. */
    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        throw new IllegalArgumentException("Expected a SQL date result but received: " + value);
    }
}
