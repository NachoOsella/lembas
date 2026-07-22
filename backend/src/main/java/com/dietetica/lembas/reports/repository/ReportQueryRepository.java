package com.dietetica.lembas.reports.repository;

import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.reports.dto.CashMethodTotalDto;
import com.dietetica.lembas.reports.dto.CashOverviewDailyDto;
import com.dietetica.lembas.reports.dto.CashSessionSummaryDto;
import com.dietetica.lembas.reports.dto.SalesByHourDto;
import com.dietetica.lembas.reports.dto.SalesByMethodDto;
import com.dietetica.lembas.reports.dto.TopProductDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Repository;

/**
 * Custom read-only repository that runs the aggregations powering the
 * operational dashboard, the cash session history, and the rule-based
 * recommendations.
 *
 * <p>Kept as a dedicated {@code @Repository} (instead of piling queries on
 * existing aggregate repositories) so the data-access logic for reporting
 * stays self-contained and easy to evolve without touching the core CRUD
 * repositories.</p>
 *
 * <p>Branch-aware filters use the convention {@code :branchId IS NULL OR
 * ... = :branchId} so callers can pass {@code null} to mean "any branch"
 * (consolidated report for ADMIN) or a specific id (single branch or forced
 * branch for MANAGER/EMPLOYEE). Date filters use half-open intervals
 * {@code [start, end)} so the boundaries do not double-count.</p>
 */
@Repository
public class ReportQueryRepository {

    /** Business timezone used to assign transactions to local reporting days. */
    public static final ZoneId REPORT_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final EntityManager em;

    public ReportQueryRepository(EntityManager em) {
        this.em = em;
    }

    // ---------------------------------------------------------------------------
    // Dashboard aggregations
    // ---------------------------------------------------------------------------

    /**
     * Q1 + Q7: total revenue and average order value for the period.
     *
     * @return array {@code [sum, avg]}, both non-null {@link BigDecimal} with
     *         two decimals; zeros when there are no matching orders.
     */
    public BigDecimal[] totalAndAverageRevenue(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select coalesce(sum(o.total), 0), coalesce(avg(o.total), 0)
                from Order o
                where o.paidAt >= :start
                  and o.paidAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                """;
        Object[] row = (Object[]) em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getSingleResult();
        BigDecimal total = toBigDecimal(row[0]);
        BigDecimal avg = toBigDecimal(row[1]).setScale(2, RoundingMode.HALF_UP);
        return new BigDecimal[] {total.setScale(2, RoundingMode.HALF_UP), avg};
    }

    /** Q1b: count of confirmed orders in the period. */
    public long countConfirmedOrders(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select count(o)
                from Order o
                where o.paidAt >= :start
                  and o.paidAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                """;
        return em.createQuery(jpql, Long.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getSingleResult();
    }

    /**
     * Q2: revenue and order count grouped by order type.
     *
     * @return list of arrays {@code [type, count, total]}; type is the
     *         {@code name()} of {@link com.dietetica.lembas.orders.model.OrderType}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> revenueByType(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select o.type, count(o), coalesce(sum(o.total), 0)
                from Order o
                where o.paidAt >= :start
                  and o.paidAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                group by o.type
                """;
        return em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /** Q3: count of orders in non-terminal states. */
    public long countPendingOrders(Long branchId) {
        String jpql =
                """
                select count(o)
                from Order o
                where o.type = com.dietetica.lembas.orders.model.OrderType.ONLINE
                  and o.status in (
                      com.dietetica.lembas.orders.model.OrderStatus.PENDING_PAYMENT,
                      com.dietetica.lembas.orders.model.OrderStatus.PAID,
                      com.dietetica.lembas.orders.model.OrderStatus.PREPARING,
                      com.dietetica.lembas.orders.model.OrderStatus.READY
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                """;
        return em.createQuery(jpql, Long.class)
                .setParameter("branchId", branchId)
                .getSingleResult();
    }

    /**
     * Q4: products with available stock below the configured minimum.
     *
     * @return list of arrays {@code [productId, name, currentStock, minimumStock]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> lowStockProducts(Long branchId) {
        String sql =
                """
                select p.id, p.name, coalesce(sum(l.quantity_available), 0),
                       p.minimum_stock, b.id, b.name
                from products p
                cross join branches b
                left join stock_lots l on l.product_id = p.id
                                      and l.branch_id = b.id
                                      and l.status = 'ACTIVE'
                where p.active = true
                  and p.minimum_stock is not null
                  and b.active = true
                  and (cast(?1 as bigint) is null or b.id = cast(?1 as bigint))
                group by p.id, p.name, p.minimum_stock, b.id, b.name
                having coalesce(sum(l.quantity_available), 0) < p.minimum_stock
                order by b.name, p.name
                """;
        return em.createNativeQuery(sql).setParameter(1, branchId).getResultList();
    }

    /**
     * Q5: lots expiring within {@code daysAhead} days, with positive
     * available quantity and ACTIVE status.
     *
     * @return list of arrays {@code [lotId, productId, productName, lotCode,
     *         expirationDate, quantityAvailable]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> expiringLots(int daysAhead, Long branchId) {
        String jpql =
                """
                select l.id, p.id, p.name, l.lotCode, l.expirationDate, l.quantityAvailable
                from StockLot l
                join l.product p
                where l.expirationDate is not null
                  and l.expirationDate >= :today
                  and l.expirationDate <= :limit
                  and l.quantityAvailable > 0
                  and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and (:branchId is null or l.branch.id = :branchId)
                order by l.expirationDate asc, l.id asc
                """;
        return em.createQuery(jpql)
                .setParameter("today", LocalDate.now(REPORT_ZONE))
                .setParameter("limit", LocalDate.now(REPORT_ZONE).plusDays(daysAhead))
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /**
     * Q6: top products by quantity sold in the period.
     *
     * <p>Returns at most {@code limit} rows. The product's category name is
     * loaded via LEFT JOIN so products without a category still appear in the
     * ranking.</p>
     */
    @SuppressWarnings("unchecked")
    public List<TopProductDto> topProducts(OffsetDateTime start, OffsetDateTime end, Long branchId, int limit) {
        String jpql =
                """
                select oi.product.id, oi.productNameSnapshot, oi.productBarcodeSnapshot,
                       p.imageUrl, p.brandName,
                       oi.categoryIdSnapshot, oi.categoryNameSnapshot,
                       sum(oi.quantity),
                       sum(case when o.subtotal > 0
                                then oi.subtotalAmount * o.total / o.subtotal
                                else oi.subtotalAmount end)
                from OrderItem oi
                join oi.order o
                left join oi.product p
                where o.paidAt >= :start
                  and o.paidAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                group by oi.product.id, oi.productNameSnapshot, oi.productBarcodeSnapshot,
                         p.imageUrl, p.brandName, oi.categoryIdSnapshot, oi.categoryNameSnapshot
                order by sum(case when o.subtotal > 0
                                  then oi.subtotalAmount * o.total / o.subtotal
                                  else oi.subtotalAmount end) desc,
                         sum(oi.quantity) desc
                """;
        List<Object[]> rows = em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .setMaxResults(limit)
                .getResultList();

        List<TopProductDto> result = new ArrayList<>(rows.size());
        int position = 1;
        for (Object[] row : rows) {
            BigDecimal qty = toBigDecimal(row[7]);
            BigDecimal revenue = toBigDecimal(row[8]).setScale(2, RoundingMode.HALF_UP);
            BigDecimal avgPrice =
                    qty.signum() > 0 ? revenue.divide(qty, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
            result.add(new TopProductDto(
                    position++,
                    (Long) row[0],
                    (String) row[1],
                    (String) row[2],
                    row[5] == null ? null : ((Number) row[5]).longValue(),
                    (String) row[6],
                    (String) row[4],
                    qty.stripTrailingZeros(),
                    revenue,
                    avgPrice,
                    (String) row[3]));
        }
        return result;
    }

    /**
     * Q8: sales grouped by hour of the day, for the chart.
     *
     * <p>Uses PostgreSQL {@code EXTRACT(HOUR FROM ...)} so the report can
     * reuse the same query when the JVM timezone changes (DB stores UTC,
     * extraction is done server-side on the timestamp's UTC value).</p>
     */
    @SuppressWarnings("unchecked")
    public List<SalesByHourDto> salesByHour(LocalDate date, Long branchId) {
        OffsetDateTime start = date.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = start.plusDays(1);
        String sql =
                """
                select extract(hour from o.paid_at at time zone 'America/Argentina/Buenos_Aires') as hour,
                       count(*) as order_count,
                       coalesce(sum(o.total), 0) as revenue,
                       sum(case when o.type = 'ONLINE' then 1 else 0 end) as online,
                       sum(case when o.type = 'POS' then 1 else 0 end) as pos
                from orders o
                where o.paid_at >= ?1
                  and o.paid_at < ?2
                  and o.status not in ('CANCELLED', 'PAYMENT_FAILED', 'STOCK_CONFLICT')
                  and o.branch_id = coalesce(cast(?3 as bigint), o.branch_id)
                group by extract(hour from o.paid_at at time zone 'America/Argentina/Buenos_Aires')
                order by hour
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter(1, start)
                .setParameter(2, end)
                .setParameter(3, branchId)
                .getResultList();

        // Normalize into a complete 0-23 hour list so the chart is gap-free.
        long[] counts = new long[24];
        BigDecimal[] revenue = new BigDecimal[24];
        long[] online = new long[24];
        long[] pos = new long[24];
        for (int h = 0; h < 24; h++) {
            revenue[h] = BigDecimal.ZERO.setScale(2);
        }
        for (Object[] row : rows) {
            int hour = ((Number) row[0]).intValue();
            counts[hour] = ((Number) row[1]).longValue();
            revenue[hour] = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
            online[hour] = ((Number) row[3]).longValue();
            pos[hour] = ((Number) row[4]).longValue();
        }
        List<SalesByHourDto> result = new ArrayList<>(24);
        for (int h = 0; h < 24; h++) {
            result.add(new SalesByHourDto(h, counts[h], revenue[h], online[h], pos[h]));
        }
        return result;
    }

    /**
     * Q9: payment method distribution for the period. Returns one entry per
     * payment method with at least one APPROVED transaction; the chart
     * shows a fallback "Otros" slice for methods that are not in the
     * PaymentMethod enum.
     */
    @SuppressWarnings("unchecked")
    public List<SalesByMethodDto> salesByMethod(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select p.method, count(p), coalesce(sum(p.amount), 0)
                from Payment p
                join p.order o
                where p.status = com.dietetica.lembas.payments.model.PaymentStatus.APPROVED
                  and p.approvedAt >= :start
                  and p.approvedAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                group by p.method
                """;
        List<Object[]> rows = em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();

        // Sum the total to compute percentages.
        BigDecimal grandTotal = BigDecimal.ZERO;
        for (Object[] row : rows) {
            grandTotal = grandTotal.add(toBigDecimal(row[2]));
        }

        List<SalesByMethodDto> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            BigDecimal amount = toBigDecimal(row[2]).setScale(2, RoundingMode.HALF_UP);
            BigDecimal percentage = grandTotal.signum() > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(grandTotal, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2);
            String method = row[0] == null ? "OTHER" : row[0].toString();
            result.add(new SalesByMethodDto(
                    method, methodLabel(method), amount, ((Number) row[1]).longValue(), percentage));
        }
        // Sort by amount descending so the doughnut chart shows the largest slice first.
        result.sort((a, b) -> b.totalAmount().compareTo(a.totalAmount()));
        return result;
    }

    /** Q-stats: count of active products and active suppliers. */
    public long countActiveProducts() {
        return em.createQuery("select count(p) from Product p where p.active = true", Long.class)
                .getSingleResult();
    }

    /** Q-stats: count of active suppliers. */
    public long countActiveSuppliers() {
        return em.createQuery("select count(s) from Supplier s where s.active = true", Long.class)
                .getSingleResult();
    }

    // ---------------------------------------------------------------------------
    // Cash overview
    // ---------------------------------------------------------------------------

    /**
     * Aggregates closed and open sessions created in the requested period.
     * The row contains only raw numeric facts; presentation is handled by the client.
     */
    public Object[] cashOverviewTotals(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String sql =
                """
                select count(*) filter (where cs.status = 'CLOSED'),
                       count(*) filter (where cs.status = 'OPEN'),
                       count(*) filter (where cs.status = 'CLOSED'
                                          and coalesce(cs.cash_difference_amount, 0) = 0),
                       count(*) filter (where cs.status = 'CLOSED'
                                          and coalesce(cs.cash_difference_amount, 0) <> 0),
                       coalesce(sum(cs.expected_cash_amount) filter (where cs.status = 'CLOSED'), 0),
                       coalesce(sum(cs.counted_cash_amount) filter (where cs.status = 'CLOSED'), 0),
                       coalesce(sum(cs.cash_difference_amount) filter (where cs.status = 'CLOSED'), 0),
                       coalesce(sum(abs(cs.cash_difference_amount)) filter (where cs.status = 'CLOSED'), 0)
                from cash_sessions cs
                where (
                      (cs.status = 'CLOSED' and cs.closed_at >= ?1 and cs.closed_at < ?2)
                   or (cs.status = 'OPEN' and cs.opened_at >= ?1 and cs.opened_at < ?2)
                )
                  and (cast(?3 as bigint) is null or cs.branch_id = cast(?3 as bigint))
                """;
        return (Object[]) em.createNativeQuery(sql)
                .setParameter(1, start)
                .setParameter(2, end)
                .setParameter(3, branchId)
                .getSingleResult();
    }

    /** Returns a gap-free daily series based on the sessions' close timestamp. */
    @SuppressWarnings("unchecked")
    public List<CashOverviewDailyDto> cashOverviewDailySeries(LocalDate from, LocalDate to, Long branchId) {
        OffsetDateTime start = from.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = to.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        String sql =
                """
                select cast(cs.closed_at at time zone
                            'America/Argentina/Buenos_Aires' as date), count(*),
                       coalesce(sum(cs.expected_cash_amount), 0),
                       coalesce(sum(cs.counted_cash_amount), 0),
                       coalesce(sum(cs.cash_difference_amount), 0)
                from cash_sessions cs
                where cs.status = 'CLOSED'
                  and cs.closed_at >= ?1
                  and cs.closed_at < ?2
                  and (cast(?3 as bigint) is null or cs.branch_id = cast(?3 as bigint))
                group by cast(cs.closed_at at time zone
                         'America/Argentina/Buenos_Aires' as date)
                order by cast(cs.closed_at at time zone
                         'America/Argentina/Buenos_Aires' as date)
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter(1, start)
                .setParameter(2, end)
                .setParameter(3, branchId)
                .getResultList();
        java.util.Map<LocalDate, Object[]> byDate = new java.util.HashMap<>();
        for (Object[] row : rows) {
            LocalDate date = ((java.sql.Date) row[0]).toLocalDate();
            byDate.put(date, row);
        }
        List<CashOverviewDailyDto> result = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            Object[] row = byDate.get(date);
            result.add(new CashOverviewDailyDto(
                    date,
                    row == null ? 0 : ((Number) row[1]).longValue(),
                    row == null ? BigDecimal.ZERO : toBigDecimal(row[2]),
                    row == null ? BigDecimal.ZERO : toBigDecimal(row[3]),
                    row == null ? BigDecimal.ZERO : toBigDecimal(row[4])));
        }
        return result;
    }

    /** Approved payment-method totals for sessions opened in the requested period. */
    @SuppressWarnings("unchecked")
    public List<CashMethodTotalDto> cashOverviewPaymentMethods(
            OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String sql =
                """
                select p.method, coalesce(sum(p.amount), 0), count(*)
                from payments p
                join cash_sessions cs on cs.id = p.cash_session_id
                where p.status = 'APPROVED'
                  and cs.status = 'CLOSED'
                  and cs.closed_at >= ?1
                  and cs.closed_at < ?2
                  and (cast(?3 as bigint) is null or cs.branch_id = cast(?3 as bigint))
                group by p.method
                order by sum(p.amount) desc
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter(1, start)
                .setParameter(2, end)
                .setParameter(3, branchId)
                .getResultList();
        List<CashMethodTotalDto> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(new CashMethodTotalDto(
                    row[0] == null ? "OTHER" : row[0].toString(), toBigDecimal(row[1]), ((Number) row[2]).longValue()));
        }
        return result;
    }

    /** Returns the most recent closed sessions with a cash discrepancy. */
    public List<CashSessionSummaryDto> cashSessionsWithDiscrepancy(
            Long branchId, OffsetDateTime from, OffsetDateTime to, int limit) {
        String jpql =
                """
                select new com.dietetica.lembas.reports.dto.CashSessionSummaryDto(
                    cs.id, b.id, b.name,
                    concat(coalesce(o.firstName, ''), ' ', coalesce(o.lastName, '')),
                    concat(coalesce(c.firstName, ''), ' ', coalesce(c.lastName, '')),
                    cs.openedAt, cs.closedAt, cs.openingCashAmount,
                    cs.expectedCashAmount, cs.countedCashAmount,
                    cs.cashDifferenceAmount, cs.cashDifferenceReason,
                    cs.status,
                    coalesce((select count(p) from Payment p
                              where p.cashSessionId = cs.id
                                and p.status = com.dietetica.lembas.payments.model.PaymentStatus.APPROVED), 0),
                    coalesce((select count(m) from CashMovement m where m.cashSession.id = cs.id), 0)
                )
                from CashSession cs
                join cs.branch b
                join cs.openedByUser o
                left join cs.closedByUser c
                where cs.status = com.dietetica.lembas.cash.model.CashSessionStatus.CLOSED
                  and cs.closedAt >= :from
                  and cs.closedAt < :to
                  and cs.cashDifferenceAmount <> 0
                  and (:branchId is null or cs.branch.id = :branchId)
                order by abs(cs.cashDifferenceAmount) desc, cs.closedAt desc
                """;
        return em.createQuery(jpql, CashSessionSummaryDto.class)
                .setParameter("branchId", branchId)
                .setParameter("from", from)
                .setParameter("to", to)
                .setMaxResults(limit)
                .getResultList();
    }

    // ---------------------------------------------------------------------------
    // Cash session history
    // ---------------------------------------------------------------------------

    /**
     * Q11: paginated list of cash sessions with optional filters.
     *
     * <p>Implemented as a JPQL constructor expression so the result is
     * strongly-typed and the columns are loaded eagerly (no N+1 on
     * branch/opener/closer).</p>
     *
     * <p>Sort order is read from the {@code sort} parameter as
     * {@code field,direction} (e.g. {@code openedAt,desc}). Only allow-listed
     * fields are accepted; anything else falls back to the default.</p>
     */
    public List<CashSessionSummaryDto> cashSessionHistory(
            Long branchId,
            OffsetDateTime from,
            OffsetDateTime to,
            Long openedBy,
            Long closedBy,
            CashSessionStatus status,
            int first,
            int pageSize,
            String sort) {
        StringBuilder jpql = new StringBuilder(
                """
                select new com.dietetica.lembas.reports.dto.CashSessionSummaryDto(
                    cs.id, b.id, b.name,
                    concat(coalesce(o.firstName, ''), ' ', coalesce(o.lastName, '')),
                    concat(coalesce(c.firstName, ''), ' ', coalesce(c.lastName, '')),
                    cs.openedAt, cs.closedAt, cs.openingCashAmount,
                    cs.expectedCashAmount, cs.countedCashAmount,
                    cs.cashDifferenceAmount, cs.cashDifferenceReason,
                    cs.status,
                    coalesce((select count(p) from Payment p
                              where p.cashSessionId = cs.id
                                and p.status = com.dietetica.lembas.payments.model.PaymentStatus.APPROVED), 0),
                    coalesce((select count(m) from CashMovement m where m.cashSession.id = cs.id), 0)
                )
                from CashSession cs
                join cs.branch b
                join cs.openedByUser o
                left join cs.closedByUser c
                where (:branchId is null or cs.branch.id = :branchId)
                  and (:status is null or cs.status = :status)
                  and (:openedBy is null or cs.openedByUser.id = :openedBy)
                  and (:closedBy is null or cs.closedByUser.id = :closedBy)
                  and cs.openedAt >= :from
                  and cs.openedAt < :to
                """);
        jpql.append(orderByClause(sort));

        TypedQuery<CashSessionSummaryDto> query = em.createQuery(jpql.toString(), CashSessionSummaryDto.class)
                .setParameter("branchId", branchId)
                .setParameter("status", status)
                .setParameter("openedBy", openedBy)
                .setParameter("closedBy", closedBy)
                .setParameter("from", from)
                .setParameter("to", to);
        if (first > 0) {
            query.setFirstResult(first);
        }
        query.setMaxResults(pageSize);
        return query.getResultList();
    }

    /** Count for the history pagination. */
    public long countCashSessionHistory(
            Long branchId,
            OffsetDateTime from,
            OffsetDateTime to,
            Long openedBy,
            Long closedBy,
            CashSessionStatus status) {
        String jpql =
                """
                select count(cs)
                from CashSession cs
                where (:branchId is null or cs.branch.id = :branchId)
                  and (:status is null or cs.status = :status)
                  and (:openedBy is null or cs.openedByUser.id = :openedBy)
                  and (:closedBy is null or cs.closedByUser.id = :closedBy)
                  and cs.openedAt >= :from
                  and cs.openedAt < :to
                """;
        return em.createQuery(jpql, Long.class)
                .setParameter("branchId", branchId)
                .setParameter("status", status)
                .setParameter("openedBy", openedBy)
                .setParameter("closedBy", closedBy)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
    }

    // ---------------------------------------------------------------------------
    // Cash report aggregates
    // ---------------------------------------------------------------------------

    /** Number of APPROVED payments linked to a cash session. */
    public long countApprovedPayments(Long sessionId) {
        return em.createQuery(
                        """
                        select count(p) from Payment p
                        where p.cashSessionId = :sid
                          and p.status = com.dietetica.lembas.payments.model.PaymentStatus.APPROVED
                        """,
                        Long.class)
                .setParameter("sid", sessionId)
                .getSingleResult();
    }

    /** Count of POS orders linked to a cash session. */
    public long countPosOrdersForSession(Long sessionId) {
        return em.createQuery(
                        """
                        select count(o) from Order o
                        where o.cashSessionId = :sid
                          and o.type = com.dietetica.lembas.orders.model.OrderType.POS
                          and o.status <> com.dietetica.lembas.orders.model.OrderStatus.CANCELLED
                        """,
                        Long.class)
                .setParameter("sid", sessionId)
                .getSingleResult();
    }

    /** Sum of APPROVED payment amounts for a cash session. */
    public BigDecimal totalPosRevenueForSession(Long sessionId) {
        BigDecimal raw = toBigDecimal(em.createQuery(
                        """
                        select coalesce(sum(p.amount), 0) from Payment p
                        where p.cashSessionId = :sid
                          and p.status = com.dietetica.lembas.payments.model.PaymentStatus.APPROVED
                        """)
                .setParameter("sid", sessionId)
                .getSingleResult());
        return raw.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Loads the manual movements for a session as DTOs, ordered chronologically.
     * Used by the cash detail report.
     */
    @SuppressWarnings("unchecked")
    public List<CashMovementDto> manualMovementsForSession(Long sessionId) {
        String jpql =
                """
                select new com.dietetica.lembas.cash.dto.CashMovementDto(
                    m.id, m.cashSession.id, m.type, m.method, m.amount,
                    m.reason, m.createdByUser.id,
                    concat(coalesce(u.firstName, ''), ' ', coalesce(u.lastName, '')),
                    m.createdAt
                )
                from CashMovement m
                left join m.createdByUser u
                where m.cashSession.id = :sid
                order by m.createdAt asc, m.id asc
                """;
        return em.createQuery(jpql).setParameter("sid", sessionId).getResultList();
    }

    /** Loads a cash session by id, eagerly fetching the opener/closer/branch. */
    public CashSession findSessionById(Long id) {
        List<CashSession> sessions = em.createQuery(
                        """
                        select cs from CashSession cs
                        join fetch cs.branch
                        join fetch cs.openedByUser
                        left join fetch cs.closedByUser
                        where cs.id = :id
                        """,
                        CashSession.class)
                .setParameter("id", id)
                .getResultList();
        return sessions.isEmpty() ? null : sessions.get(0);
    }

    // ---------------------------------------------------------------------------
    // Sales report (Reportes / Ventas)
    // ---------------------------------------------------------------------------

    /**
     * Q-S1: total revenue grouped by day, for the period. One row per day
     * with at least one confirmed order. Returns a complete day list so
     * the chart does not have gaps.
     *
     * @return list of arrays {@code [date, revenue, orderCount]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> salesByDay(LocalDate from, LocalDate to, Long branchId) {
        OffsetDateTime start = from.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        OffsetDateTime end = to.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        String sql =
                """
                select cast(o.paid_at at time zone 'America/Argentina/Buenos_Aires' as date) as day,
                       coalesce(sum(o.total), 0) as revenue,
                       count(*) as order_count
                from orders o
                where o.paid_at >= ?1
                  and o.paid_at < ?2
                  and o.status not in ('CANCELLED', 'PAYMENT_FAILED', 'STOCK_CONFLICT')
                  and o.branch_id = coalesce(cast(?3 as bigint), o.branch_id)
                group by cast(o.paid_at at time zone 'America/Argentina/Buenos_Aires' as date)
                order by day
                """;
        return em.createNativeQuery(sql)
                .setParameter(1, start)
                .setParameter(2, end)
                .setParameter(3, branchId)
                .getResultList();
    }

    /** Returns cost of goods sold from immutable stock-movement cost snapshots. */
    public BigDecimal costOfGoodsSold(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String sql =
                """
                select coalesce(sum(abs(sm.quantity) * sm.unit_cost_snapshot), 0)
                from stock_movements sm
                join orders o on o.id = sm.order_id
                where sm.type in ('POS_SALE', 'ONLINE_SALE')
                  and sm.unit_cost_snapshot is not null
                  and o.paid_at >= ?1
                  and o.paid_at < ?2
                  and o.status not in ('CANCELLED', 'PAYMENT_FAILED', 'STOCK_CONFLICT')
                  and (cast(?3 as bigint) is null or o.branch_id = cast(?3 as bigint))
                """;
        return toBigDecimal(em.createNativeQuery(sql)
                        .setParameter(1, start)
                        .setParameter(2, end)
                        .setParameter(3, branchId)
                        .getSingleResult())
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Q-S2: revenue grouped by product category. Uses the snapshot fields
     * on the order item so the breakdown is stable even if a product's
     * category changes later.
     *
     * @return list of arrays {@code [categoryId, categoryName, revenue, count]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> salesByCategory(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select oi.categoryIdSnapshot,
                       coalesce(oi.categoryNameSnapshot, 'Sin categoria'),
                       coalesce(sum(case when o.subtotal > 0
                                         then oi.subtotalAmount * o.total / o.subtotal
                                         else oi.subtotalAmount end), 0),
                       count(oi)
                from OrderItem oi
                join oi.order o
                where o.paidAt >= :start
                  and o.paidAt < :end
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                group by oi.categoryIdSnapshot, oi.categoryNameSnapshot
                order by sum(case when o.subtotal > 0
                                  then oi.subtotalAmount * o.total / o.subtotal
                                  else oi.subtotalAmount end) desc
                """;
        return em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /**
     * Q-S3: count of cancelled orders in the period. Used to render the
     * "Devoluciones / cancelaciones" KPI on the sales report.
     */
    public long countCancelledOrders(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select count(o)
                from Order o
                where o.cancelledAt >= :start
                  and o.cancelledAt < :end
                  and o.status = com.dietetica.lembas.orders.model.OrderStatus.CANCELLED
                  and (:branchId is null or o.branch.id = :branchId)
                """;
        return em.createQuery(jpql, Long.class)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getSingleResult();
    }

    // ---------------------------------------------------------------------------
    // Inventory report (Reportes / Inventario)
    // ---------------------------------------------------------------------------

    /**
     * Q-I1: total stock value grouped by category. Uses the lot's
     * {@code unitCost} (purchase cost) and {@code quantityAvailable}.
     *
     * @return list of arrays {@code [categoryId, categoryName, value, units]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> stockValueByCategory(Long branchId) {
        String jpql =
                """
                select p.category.id, coalesce(p.category.name, 'Sin categoria'),
                       coalesce(sum(l.quantityAvailable * l.unitCost), 0),
                       coalesce(sum(l.quantityAvailable), 0)
                from StockLot l
                join l.product p
                where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and l.quantityAvailable > 0
                  and (:branchId is null or l.branch.id = :branchId)
                group by p.category.id, p.category.name
                order by sum(l.quantityAvailable * l.unitCost) desc
                """;
        return em.createQuery(jpql).setParameter("branchId", branchId).getResultList();
    }

    /**
     * Q-I2: count of lots expiring in each month of the next
     * {@code monthsAhead} months. Used to render the "Lotes por mes"
     * bar chart on the inventory report.
     *
     * @return list of arrays {@code [firstOfMonth, lotCount, units]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> expiringLotsByMonth(int monthsAhead, Long branchId) {
        LocalDate today = LocalDate.now(REPORT_ZONE);
        LocalDate limit = today.withDayOfMonth(1).plusMonths(monthsAhead);
        String sql =
                """
                select cast(date_trunc('month', l.expiration_date) as date) as month,
                       count(*) as lot_count,
                       coalesce(sum(l.quantity_available), 0) as units
                from stock_lots l
                join products p on p.id = l.product_id
                where l.expiration_date is not null
                  and l.expiration_date >= ?1
                  and l.expiration_date < ?2
                  and l.quantity_available > 0
                  and l.status = 'ACTIVE'
                  and (cast(?3 as bigint) is null or l.branch_id = cast(?3 as bigint))
                group by cast(date_trunc('month', l.expiration_date) as date)
                order by month
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter(1, today)
                .setParameter(2, limit)
                .setParameter(3, branchId)
                .getResultList();

        // Fill in the gaps so the chart is continuous.
        List<Object[]> result = new ArrayList<>();
        java.util.Map<LocalDate, Long> lotCounts = new java.util.HashMap<>();
        java.util.Map<LocalDate, BigDecimal> unitsByMonth = new java.util.HashMap<>();
        for (Object[] row : rows) {
            LocalDate month = ((java.sql.Date) row[0]).toLocalDate().withDayOfMonth(1);
            lotCounts.put(month, ((Number) row[1]).longValue());
            unitsByMonth.put(month, toBigDecimal(row[2]).stripTrailingZeros());
        }
        for (int i = 0; i < monthsAhead; i++) {
            LocalDate month = today.plusMonths(i).withDayOfMonth(1);
            result.add(new Object[] {
                month, lotCounts.getOrDefault(month, 0L), unitsByMonth.getOrDefault(month, BigDecimal.ZERO)
            });
        }
        return result;
    }

    /**
     * Q-I3: top N products by stock value (capital immobilized in
     * active lots). Returns the product id, name, category and the
     * value + units.
     *
     * @return list of arrays {@code [productId, productName, category, value, units]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> topStockByValue(Long branchId, int limit) {
        String jpql =
                """
                select p.id, p.name, c.name,
                       coalesce(sum(l.quantityAvailable * l.unitCost), 0),
                       coalesce(sum(l.quantityAvailable), 0)
                from StockLot l
                join l.product p
                left join p.category c
                where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and l.quantityAvailable > 0
                  and (:branchId is null or l.branch.id = :branchId)
                group by p.id, p.name, c.name
                order by sum(l.quantityAvailable * l.unitCost) desc
                """;
        return em.createQuery(jpql)
                .setParameter("branchId", branchId)
                .setMaxResults(limit)
                .getResultList();
    }

    // ---------------------------------------------------------------------------
    // Suppliers report (Reportes / Proveedores)
    // ---------------------------------------------------------------------------

    /**
     * Q-SP1: actual received cost grouped by the confirmed receipt month.
     * Uses received quantities and immutable receipt unit costs, excluding
     * draft and cancelled receipts.
     *
     * @return list of arrays {@code [firstOfMonth, total, orderCount]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> purchasesByMonth(OffsetDateTime from, OffsetDateTime to, Long branchId) {
        String sql =
                """
                select cast(date_trunc('month', pr.received_at at time zone
                            'America/Argentina/Buenos_Aires') as date) as month,
                       coalesce(sum(pri.quantity_received * pri.unit_cost), 0),
                       count(distinct pr.id)
                from purchase_receipts pr
                join purchase_receipt_items pri on pri.purchase_receipt_id = pr.id
                where pr.status = 'CONFIRMED'
                  and pr.received_at >= ?1
                  and pr.received_at < ?2
                  and (cast(?3 as bigint) is null or pr.branch_id = cast(?3 as bigint))
                group by cast(date_trunc('month', pr.received_at at time zone
                         'America/Argentina/Buenos_Aires') as date)
                order by month
                """;
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter(1, from)
                .setParameter(2, to)
                .setParameter(3, branchId)
                .getResultList();

        List<Object[]> result = new ArrayList<>();
        LocalDate start = from.atZoneSameInstant(REPORT_ZONE).toLocalDate().withDayOfMonth(1);
        LocalDate end =
                to.minusNanos(1).atZoneSameInstant(REPORT_ZONE).toLocalDate().withDayOfMonth(1);
        java.util.Map<LocalDate, BigDecimal> amounts = new java.util.HashMap<>();
        java.util.Map<LocalDate, Long> receipts = new java.util.HashMap<>();
        for (Object[] row : rows) {
            LocalDate month = ((java.sql.Date) row[0]).toLocalDate().withDayOfMonth(1);
            amounts.put(month, toBigDecimal(row[1]).setScale(2, RoundingMode.HALF_UP));
            receipts.put(month, ((Number) row[2]).longValue());
        }
        for (LocalDate month = start; !month.isAfter(end); month = month.plusMonths(1)) {
            result.add(new Object[] {
                month,
                amounts.getOrDefault(month, BigDecimal.ZERO.setScale(2)),
                BigDecimal.valueOf(receipts.getOrDefault(month, 0L))
            });
        }
        return result;
    }

    /**
     * Q-SP2: top suppliers by total purchased amount in the period.
     *
     * @return list of arrays {@code [supplierId, supplierName, total, orderCount]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> topSuppliersByVolume(OffsetDateTime from, OffsetDateTime to, Long branchId, int limit) {
        String sql =
                """
                select s.id, s.name,
                       coalesce(sum(pri.quantity_received * pri.unit_cost), 0),
                       count(distinct pr.id)
                from purchase_receipts pr
                join suppliers s on s.id = pr.supplier_id
                join purchase_receipt_items pri on pri.purchase_receipt_id = pr.id
                where pr.status = 'CONFIRMED'
                  and pr.received_at >= ?1
                  and pr.received_at < ?2
                  and (cast(?3 as bigint) is null or pr.branch_id = cast(?3 as bigint))
                group by s.id, s.name
                order by sum(pri.quantity_received * pri.unit_cost) desc
                """;
        return em.createNativeQuery(sql)
                .setParameter(1, from)
                .setParameter(2, to)
                .setParameter(3, branchId)
                .setMaxResults(limit)
                .getResultList();
    }

    /**
     * Q-SP3: average delivery lead time per supplier. Lead time is the gap
     * between order emission and its final confirmed receipt, so partial
     * deliveries do not make an incomplete order appear completed.
     *
     * @return list of arrays {@code [supplierId, supplierName, avgDays, orderCount]}.
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> avgLeadTimeBySupplier(OffsetDateTime from, OffsetDateTime to, Long branchId, int limit) {
        String sql =
                """
                with completed_deliveries as (
                    select po.id, po.supplier_id, po.order_date,
                           max(pr.received_at) as completed_at
                    from purchase_orders po
                    join purchase_receipts pr on pr.purchase_order_id = po.id
                                              and pr.status = 'CONFIRMED'
                    where pr.received_at >= ?1
                      and pr.received_at < ?2
                      and (cast(?3 as bigint) is null or pr.branch_id = cast(?3 as bigint))
                    group by po.id, po.supplier_id, po.order_date
                )
                select s.id, s.name,
                       avg(extract(epoch from (d.completed_at - d.order_date)) / 86400.0),
                       count(d.id)
                from completed_deliveries d
                join suppliers s on s.id = d.supplier_id
                group by s.id, s.name
                order by avg(extract(epoch from (d.completed_at - d.order_date)) / 86400.0) asc
                """;
        return em.createNativeQuery(sql)
                .setParameter(1, from)
                .setParameter(2, to)
                .setParameter(3, branchId)
                .setMaxResults(limit)
                .getResultList();
    }

    /**
     * Q-SP4: high-level purchase aggregates for the suppliers report
     * KPIs.
     *
     * @return array {@code [receivedCost, receiptCount, avgLeadDays, onTimePercentage]}.
     */
    public Object[] purchaseAggregates(OffsetDateTime from, OffsetDateTime to, Long branchId) {
        String sql =
                """
                with period_receipts as (
                    select pr.*
                    from purchase_receipts pr
                    where pr.status = 'CONFIRMED'
                      and pr.received_at >= ?1
                      and pr.received_at < ?2
                      and (cast(?3 as bigint) is null or pr.branch_id = cast(?3 as bigint))
                ), completed_deliveries as (
                    select po.id, po.order_date, po.expected_delivery_date,
                           max(pr.received_at) as completed_at
                    from purchase_orders po
                    join period_receipts pr on pr.purchase_order_id = po.id
                    group by po.id, po.order_date, po.expected_delivery_date
                ), receipt_totals as (
                    select coalesce(sum(pri.quantity_received * pri.unit_cost), 0) as amount,
                           count(distinct pr.id) as receipt_count
                    from period_receipts pr
                    join purchase_receipt_items pri on pri.purchase_receipt_id = pr.id
                )
                select rt.amount, rt.receipt_count,
                       coalesce((select avg(extract(epoch from (completed_at - order_date)) / 86400.0)
                                 from completed_deliveries), 0),
                       coalesce((select 100.0 * count(*) filter (
                                             where expected_delivery_date is not null
                                               and cast(completed_at at time zone
                                                   'America/Argentina/Buenos_Aires' as date)
                                                   <= expected_delivery_date)
                                        / nullif(count(*) filter (where expected_delivery_date is not null), 0)
                                 from completed_deliveries), 0)
                from receipt_totals rt
                """;
        return (Object[]) em.createNativeQuery(sql)
                .setParameter(1, from)
                .setParameter(2, to)
                .setParameter(3, branchId)
                .getSingleResult();
    }

    /**
     * Q-I4: total stock value (sum of {@code quantityAvailable *
     * unitCost}) across all active lots, optionally filtered by branch.
     */
    public BigDecimal totalStockValue(Long branchId) {
        String jpql =
                """
                select coalesce(sum(l.quantityAvailable * l.unitCost), 0)
                from StockLot l
                where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and l.quantityAvailable > 0
                  and (:branchId is null or l.branch.id = :branchId)
                """;
        return toBigDecimal(em.createQuery(jpql, BigDecimal.class)
                .setParameter("branchId", branchId)
                .getSingleResult());
    }

    /** Capital at risk in active stock expiring within the requested horizon. */
    public BigDecimal expiringStockValue(int daysAhead, Long branchId) {
        LocalDate today = LocalDate.now(REPORT_ZONE);
        String jpql =
                """
                select coalesce(sum(l.quantityAvailable * l.unitCost), 0)
                from StockLot l
                where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and l.quantityAvailable > 0
                  and l.expirationDate between :today and :limit
                  and (:branchId is null or l.branch.id = :branchId)
                """;
        return toBigDecimal(em.createQuery(jpql, BigDecimal.class)
                .setParameter("today", today)
                .setParameter("limit", today.plusDays(daysAhead))
                .setParameter("branchId", branchId)
                .getSingleResult());
    }

    /** Counts active lots with positive stock whose expiration date has passed. */
    public long countExpiredLots(Long branchId) {
        return em.createQuery(
                        """
                        select count(l) from StockLot l
                        where l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                          and l.quantityAvailable > 0
                          and l.expirationDate < :today
                          and (:branchId is null or l.branch.id = :branchId)
                        """,
                        Long.class)
                .setParameter("today", LocalDate.now(REPORT_ZONE))
                .setParameter("branchId", branchId)
                .getSingleResult();
    }

    // ---------------------------------------------------------------------------
    // Recommendations
    // ---------------------------------------------------------------------------

    /** Q12: products with stock below the configured minimum. */
    @SuppressWarnings("unchecked")
    public List<Object[]> lowStockCandidates(Long branchId) {
        String sql =
                """
                select p.id, p.name, c.id, c.name, p.barcode, p.minimum_stock,
                       coalesce(sum(l.quantity_available), 0), b.id, b.name
                from products p
                left join categories c on c.id = p.category_id
                cross join branches b
                left join stock_lots l on l.product_id = p.id
                                      and l.branch_id = b.id
                                      and l.status = 'ACTIVE'
                where p.active = true
                  and p.minimum_stock is not null
                  and b.active = true
                  and (cast(?1 as bigint) is null or b.id = cast(?1 as bigint))
                group by p.id, p.name, c.id, c.name, p.barcode, p.minimum_stock, b.id, b.name
                having coalesce(sum(l.quantity_available), 0) < p.minimum_stock
                order by b.name, p.name
                """;
        return em.createNativeQuery(sql).setParameter(1, branchId).getResultList();
    }

    /** Q13: lots expiring within 30 days, with positive available stock. */
    @SuppressWarnings("unchecked")
    public List<Object[]> expiringLotCandidates(int daysAhead, Long branchId) {
        String jpql =
                """
                select l.id, p.id, p.name, p.category.id, c.name,
                       l.lotCode, l.expirationDate, l.quantityAvailable
                from StockLot l
                join l.product p
                left join p.category c
                where l.expirationDate is not null
                  and l.expirationDate >= :today
                  and l.expirationDate <= :limit
                  and l.quantityAvailable > 0
                  and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                  and (:branchId is null or l.branch.id = :branchId)
                order by l.expirationDate asc, l.id asc
                """;
        return em.createQuery(jpql)
                .setParameter("today", LocalDate.now(REPORT_ZONE))
                .setParameter("limit", LocalDate.now(REPORT_ZONE).plusDays(daysAhead))
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /** Q14: high-rotation products (sum of last 7d sales above threshold). */
    @SuppressWarnings("unchecked")
    public List<Object[]> highRotationCandidates(Long branchId, OffsetDateTime since) {
        String jpql =
                """
                select oi.product.id, p.name, p.category.id, c.name, sum(oi.quantity),
                       coalesce((select sum(l.quantityAvailable) from StockLot l
                                 where l.product.id = p.id
                                   and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                                   and (:branchId is null or l.branch.id = :branchId)), 0)
                from OrderItem oi
                join oi.order o
                join oi.product p
                left join p.category c
                where o.paidAt >= :since
                  and o.status not in (
                      com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                      com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                      com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                  )
                  and (:branchId is null or o.branch.id = :branchId)
                group by oi.product.id, p.name, p.category.id, c.name
                order by sum(oi.quantity) desc
                """;
        return em.createQuery(jpql)
                .setParameter("since", since)
                .setParameter("branchId", branchId)
                .setMaxResults(20)
                .getResultList();
    }

    /**
     * Q15: products that have stock but no recent sales.
     *
     * <p>The query returns the {@code lastSaleAt} as a raw timestamp so the
     * service layer can compute {@code daysWithoutSales} from the current
     * date.</p>
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> noMovementCandidates(Long branchId, OffsetDateTime cutoff) {
        String jpql =
                """
                select p.id, p.name, p.category.id, c.name, p.barcode,
                       coalesce((select sum(l.quantityAvailable)
                                 from StockLot l
                                 where l.product.id = p.id
                                   and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                                   and (:branchId is null or l.branch.id = :branchId)
                       ), 0),
                       (select max(o.paidAt) from OrderItem oi2
                                 join oi2.order o
                                 where oi2.product.id = p.id
                                   and o.status not in (
                                       com.dietetica.lembas.orders.model.OrderStatus.CANCELLED,
                                       com.dietetica.lembas.orders.model.OrderStatus.PAYMENT_FAILED,
                                       com.dietetica.lembas.orders.model.OrderStatus.STOCK_CONFLICT
                                   )
                                   and (:branchId is null or o.branch.id = :branchId)),
                       (select min(l.createdAt) from StockLot l
                                 where l.product.id = p.id
                                   and l.status = com.dietetica.lembas.inventory.model.StockLotStatus.ACTIVE
                                   and l.quantityAvailable > 0
                                   and (:branchId is null or l.branch.id = :branchId))
                from Product p
                left join p.category c
                where p.active = true
                order by p.name asc
                """;
        return em.createQuery(jpql).setParameter("branchId", branchId).getResultList();
    }

    // ---------------------------------------------------------------------------
    // Employee report aggregations
    // ---------------------------------------------------------------------------

    /**
     * Aggregates completed POS sales by the internal user who created them.
     *
     * @return rows of {@code [userId, firstName, lastName, role, saleCount, revenue, averageTicket]}
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> employeePosPerformance(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select u.id, u.firstName, u.lastName, u.role,
                       count(o), coalesce(sum(o.total), 0), coalesce(avg(o.total), 0)
                from Order o
                join o.createdByUser u
                where o.type = com.dietetica.lembas.orders.model.OrderType.POS
                  and o.status = com.dietetica.lembas.orders.model.OrderStatus.PAID
                  and o.paidAt >= :start
                  and o.paidAt < :end
                  and (:branchId is null or o.branch.id = :branchId)
                group by u.id, u.firstName, u.lastName, u.role
                """;
        return em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /**
     * Counts cash sessions opened by each internal user in the report period.
     *
     * @return rows of {@code [userId, firstName, lastName, role, openedCount]}
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> employeeCashOpenPerformance(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select u.id, u.firstName, u.lastName, u.role, count(cs)
                from CashSession cs
                join cs.openedByUser u
                where cs.openedAt >= :start
                  and cs.openedAt < :end
                  and (:branchId is null or cs.branch.id = :branchId)
                group by u.id, u.firstName, u.lastName, u.role
                """;
        return em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();
    }

    /**
     * Counts cash sessions closed by each user and sums their absolute discrepancies.
     *
     * @return rows of {@code [userId, firstName, lastName, role, closedCount, absoluteDifference]}
     */
    @SuppressWarnings("unchecked")
    public List<Object[]> employeeCashClosePerformance(OffsetDateTime start, OffsetDateTime end, Long branchId) {
        String jpql =
                """
                select u.id, u.firstName, u.lastName, u.role,
                       count(cs), coalesce(sum(abs(cs.cashDifferenceAmount)), 0)
                from CashSession cs
                join cs.closedByUser u
                where cs.status = com.dietetica.lembas.cash.model.CashSessionStatus.CLOSED
                  and cs.closedAt >= :start
                  and cs.closedAt < :end
                  and (:branchId is null or cs.branch.id = :branchId)
                group by u.id, u.firstName, u.lastName, u.role
                """;
        return em.createQuery(jpql)
                .setParameter("start", start)
                .setParameter("end", end)
                .setParameter("branchId", branchId)
                .getResultList();
    }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    /**
     * Coerces a value returned by an aggregate query to {@link BigDecimal}.
     * Hibernate may return {@code null} (empty result), {@link BigDecimal},
     * or {@link Number} depending on the driver; this normalises all cases.
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

    /**
     * Returns a stable sort clause for the cash session history query.
     * Only allow-listed columns are accepted; anything else falls back to
     * the default (most recent sessions first).
     */
    private static String orderByClause(String sort) {
        if (sort == null || sort.isBlank()) {
            return " order by cs.openedAt desc, cs.id desc";
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim();
        String direction = parts.length > 1 ? parts[1].trim().toLowerCase() : "desc";
        String column =
                switch (field) {
                    case "openedAt", "opened_at" -> "cs.openedAt";
                    case "closedAt", "closed_at" -> "cs.closedAt";
                    case "id" -> "cs.id";
                    case "status" -> "cs.status";
                    default -> "cs.openedAt";
                };
        if (!direction.equals("asc") && !direction.equals("desc")) {
            direction = "desc";
        }
        return " order by " + column + " " + direction + ", cs.id desc";
    }

    /** Localised method label for the sales-by-method chart. */
    private static String methodLabel(String method) {
        if (method == null) {
            return "Otros";
        }
        return switch (method) {
            case "CASH" -> "Efectivo";
            case "QR" -> "QR";
            case "TRANSFER" -> "Transferencia";
            case "DEBIT_CARD" -> "Tarjeta de debito";
            case "CREDIT_CARD" -> "Tarjeta de credito";
            case "CHECKOUT_PRO" -> "Mercado Pago";
            default -> "Otros";
        };
    }

    /**
     * Converts a business date to its Argentina start-of-day instant.
     * Visible for tests; the legacy method name is retained for compatibility.
     */
    public static OffsetDateTime startOfDayUtc(LocalDate date) {
        return date.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
    }

    /**
     * Converts an inclusive business date to the following Argentina
     * start-of-day instant. Visible for tests.
     */
    public static OffsetDateTime endOfDayUtc(LocalDate date) {
        return date.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime();
    }
}
