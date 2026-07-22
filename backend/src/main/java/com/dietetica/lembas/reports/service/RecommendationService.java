package com.dietetica.lembas.reports.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.reports.dto.RecommendationDto;
import com.dietetica.lembas.reports.repository.ReportQueryRepository;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rule-based recommendation engine for the operational dashboard and the
 * dedicated recommendations page (S4-US06).
 *
 * <p>Each rule is a small, pure data-to-DTO mapper. The service runs every
 * rule whose {@code type} matches the active filter (or all of them when no
 * filter is supplied), applies the {@code minUrgency} filter, deduplicates by
 * the composite id ({@code type + "-" + productId} plus lot id for
 * EXPIRING_SOON), and trims the result to the requested limit.</p>
 *
 * <p>Branch resolution mirrors {@link ReportService}: ADMIN can target any
 * branch, MANAGER/EMPLOYEE are forced to their own branch.</p>
 */
@Service
public class RecommendationService {

    private static final ZoneId REPORT_ZONE = ReportQueryRepository.REPORT_ZONE;

    /** Error codes surfaced to the FE; documented in {@code docs/05-api/error-handling.md}. */
    public static final String CODE_BRANCH_NOT_FOUND = "BRANCH_NOT_FOUND";

    public static final String CODE_INVALID_USER_BRANCH = "INVALID_USER_BRANCH";
    public static final String CODE_ACCESS_DENIED = "ACCESS_DENIED";
    public static final String CODE_INVALID_URGENCY = "INVALID_URGENCY";
    public static final String CODE_INVALID_TYPE = "INVALID_TYPE";

    /** Recommendation types. */
    public static final String TYPE_LOW_STOCK = "LOW_STOCK";

    public static final String TYPE_EXPIRING_SOON = "EXPIRING_SOON";
    public static final String TYPE_HIGH_ROTATION = "HIGH_ROTATION";
    public static final String TYPE_NO_MOVEMENT = "NO_MOVEMENT";

    /** Urgency levels, ordered from most to least severe. */
    private static final List<String> URGENCY_ORDER = List.of("HIGH", "MEDIUM", "LOW");

    private static final int EXPIRING_HORIZON_DAYS = 30;
    private static final int HIGH_ROTATION_LOOKBACK_DAYS = 7;
    private static final int HIGH_ROTATION_THRESHOLD = 10;
    private static final int NO_MOVEMENT_LOOKBACK_DAYS = 30;

    private final ReportQueryRepository reportRepository;
    private final SecurityContextHelper securityContextHelper;
    private final BranchQuery branchQuery;

    public RecommendationService(
            ReportQueryRepository reportRepository,
            SecurityContextHelper securityContextHelper,
            BranchQuery branchQuery) {
        this.reportRepository = reportRepository;
        this.securityContextHelper = securityContextHelper;
        this.branchQuery = branchQuery;
    }

    /**
     * Returns the list of recommendations matching the active filters.
     *
     * <p>Filters are combined with AND semantics. When {@code type} is null
     * every rule runs; when {@code minUrgency} is null every urgency is
     * included. The result is deduped by composite id and sorted by urgency
     * (HIGH first) and then alphabetically by product name.</p>
     *
     * @param branchId   optional branch filter (ADMIN only)
     * @param minUrgency filter by minimum urgency; null = include all
     * @param type       filter by rule type; null = include all rules
     * @param productId  optional product filter
     * @param limit      max results; null = unlimited
     * @return ordered list of recommendations
     */
    @Transactional(readOnly = true)
    public List<RecommendationDto> getRecommendations(
            Long branchId, String minUrgency, String type, Long productId, Integer limit) {
        User currentUser = securityContextHelper.getCurrentUser();
        ensureInternalUser(currentUser);

        Long effectiveBranchId = resolveBranchForUser(branchId, currentUser);
        int urgencyIndex = normalizeMinUrgency(minUrgency);
        boolean typeFilter = (type != null);
        String normalizedType = type == null ? null : normalizeType(type);

        // LinkedHashMap preserves insertion order so dedup keeps the highest-priority entry.
        Map<String, RecommendationDto> deduped = new LinkedHashMap<>();

        boolean noUrgencyFilter = urgencyIndex < 0;

        if (!typeFilter || TYPE_LOW_STOCK.equals(normalizedType)) {
            for (RecommendationDto rec : buildLowStock(effectiveBranchId, productId)) {
                if (noUrgencyFilter || matchesUrgency(rec.urgency(), urgencyIndex)) {
                    deduped.putIfAbsent(rec.id(), rec);
                }
            }
        }
        if (!typeFilter || TYPE_EXPIRING_SOON.equals(normalizedType)) {
            for (RecommendationDto rec : buildExpiringSoon(effectiveBranchId, productId)) {
                if (noUrgencyFilter || matchesUrgency(rec.urgency(), urgencyIndex)) {
                    deduped.putIfAbsent(rec.id(), rec);
                }
            }
        }
        if (!typeFilter || TYPE_HIGH_ROTATION.equals(normalizedType)) {
            for (RecommendationDto rec : buildHighRotation(effectiveBranchId, productId)) {
                if (noUrgencyFilter || matchesUrgency(rec.urgency(), urgencyIndex)) {
                    deduped.putIfAbsent(rec.id(), rec);
                }
            }
        }
        if (!typeFilter || TYPE_NO_MOVEMENT.equals(normalizedType)) {
            for (RecommendationDto rec : buildNoMovement(effectiveBranchId, productId)) {
                if (noUrgencyFilter || matchesUrgency(rec.urgency(), urgencyIndex)) {
                    deduped.putIfAbsent(rec.id(), rec);
                }
            }
        }

        List<RecommendationDto> result = new ArrayList<>(deduped.values());
        result.sort(Comparator.comparingInt((RecommendationDto r) -> URGENCY_ORDER.indexOf(r.urgency()))
                .thenComparing(r -> r.productName() == null ? "" : r.productName(), Comparator.naturalOrder()));

        if (limit != null && limit > 0 && result.size() > limit) {
            return new ArrayList<>(result.subList(0, limit));
        }
        return result;
    }

    // ---------------------------------------------------------------------------
    // Rules
    // ---------------------------------------------------------------------------

    /**
     * LOW_STOCK rule: products with available stock below the configured
     * minimum. Urgency tiers:
     * <ul>
     *   <li>HIGH: stock = 0</li>
     *   <li>MEDIUM: stock below half the minimum</li>
     *   <li>LOW: otherwise</li>
     * </ul>
     */
    private List<RecommendationDto> buildLowStock(Long branchId, Long productId) {
        List<Object[]> rows = reportRepository.lowStockCandidates(branchId);
        List<RecommendationDto> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            Long prodId = ((Number) row[0]).longValue();
            if (productId != null && !productId.equals(prodId)) {
                continue;
            }
            String name = (String) row[1];
            Long categoryId = row[2] == null ? null : ((Number) row[2]).longValue();
            String categoryName = (String) row[3];
            String barcode = (String) row[4];
            Integer minimum = ((Number) row[5]).intValue();
            BigDecimal stock = toBigDecimal(row[6]);
            Long stockBranchId = branchId;
            if (row.length > 7 && row[7] != null) {
                stockBranchId = ((Number) row[7]).longValue();
            }
            String stockBranchName = row.length > 8 ? (String) row[8] : null;
            String recommendationId =
                    TYPE_LOW_STOCK + "-" + prodId + (stockBranchId == null ? "" : "-" + stockBranchId);
            if (minimum == null) {
                continue;
            }

            String urgency;
            if (stock.signum() <= 0) {
                urgency = "HIGH";
            } else if (stock.compareTo(BigDecimal.valueOf(minimum).multiply(BigDecimal.valueOf(0.5))) < 0) {
                urgency = "MEDIUM";
            } else {
                urgency = "LOW";
            }

            String title = "Stock bajo: " + name + (stockBranchName == null ? "" : " - " + stockBranchName);
            String description = String.format(
                    new Locale("es", "AR"),
                    "Stock actual: %s, minimo: %d. Reponer antes de que se agote.",
                    formatQuantity(stock),
                    minimum);

            result.add(new RecommendationDto(
                    recommendationId,
                    TYPE_LOW_STOCK,
                    title,
                    description,
                    urgency,
                    "pi pi-exclamation-triangle",
                    "/admin/inventory/product/" + prodId + "/lots",
                    "Reponer stock",
                    prodId,
                    name,
                    categoryId,
                    categoryName,
                    barcode,
                    stock,
                    minimum,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    OffsetDateTime.now()));
        }
        return result;
    }

    /**
     * EXPIRING_SOON rule: active lots with positive quantity that expire in
     * the next {@value #EXPIRING_HORIZON_DAYS} days. Urgency tiers:
     * <ul>
     *   <li>HIGH: expires in 7 days or less</li>
     *   <li>MEDIUM: 8-14 days</li>
     *   <li>LOW: 15-30 days</li>
     * </ul>
     */
    private List<RecommendationDto> buildExpiringSoon(Long branchId, Long productId) {
        List<Object[]> rows = reportRepository.expiringLotCandidates(EXPIRING_HORIZON_DAYS, branchId);
        LocalDate today = LocalDate.now(REPORT_ZONE);
        List<RecommendationDto> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            Long lotId = ((Number) row[0]).longValue();
            Long prodId = ((Number) row[1]).longValue();
            if (productId != null && !productId.equals(prodId)) {
                continue;
            }
            String name = (String) row[2];
            Long categoryId = row[3] == null ? null : ((Number) row[3]).longValue();
            String categoryName = (String) row[4];
            String lotCode = (String) row[5];
            LocalDate expires = toLocalDate(row[6]);
            BigDecimal quantity = toBigDecimal(row[7]);
            if (expires == null) {
                continue;
            }
            long daysToExpire = today.until(expires).getDays();
            String urgency;
            if (daysToExpire <= 7) {
                urgency = "HIGH";
            } else if (daysToExpire <= 14) {
                urgency = "MEDIUM";
            } else {
                urgency = "LOW";
            }
            String title = "Lote por vencer: " + name;
            String description = String.format(
                    new Locale("es", "AR"),
                    "Vence el %s (%dd). Cantidad disponible: %s.",
                    expires.toString(),
                    daysToExpire,
                    formatQuantity(quantity));

            result.add(new RecommendationDto(
                    TYPE_EXPIRING_SOON + "-" + lotId,
                    TYPE_EXPIRING_SOON,
                    title,
                    description,
                    urgency,
                    "pi pi-calendar-times",
                    "/admin/inventory/product/" + prodId + "/lots",
                    "Ver lote",
                    prodId,
                    name,
                    categoryId,
                    categoryName,
                    null,
                    null,
                    null,
                    expires,
                    lotId,
                    lotCode,
                    quantity,
                    null,
                    null,
                    OffsetDateTime.now()));
        }
        return result;
    }

    /**
     * HIGH_ROTATION rule: products with more than
     * {@value #HIGH_ROTATION_THRESHOLD} units sold in the last
     * {@value #HIGH_ROTATION_LOOKBACK_DAYS} days. Urgency tiers:
     * <ul>
     *   <li>HIGH: top seller (>= 50 units in 7 days)</li>
     *   <li>MEDIUM: 25-49 units</li>
     *   <li>LOW: 10-24 units</li>
     * </ul>
     */
    private List<RecommendationDto> buildHighRotation(Long branchId, Long productId) {
        OffsetDateTime since = LocalDate.now(REPORT_ZONE)
                .minusDays(HIGH_ROTATION_LOOKBACK_DAYS)
                .atStartOfDay(REPORT_ZONE)
                .toOffsetDateTime();
        List<Object[]> rows = reportRepository.highRotationCandidates(branchId, since);
        List<RecommendationDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long prodId = ((Number) row[0]).longValue();
            if (productId != null && !productId.equals(prodId)) {
                continue;
            }
            String name = (String) row[1];
            Long categoryId = row[2] == null ? null : ((Number) row[2]).longValue();
            String categoryName = (String) row[3];
            int totalSold = ((Number) row[4]).intValue();
            BigDecimal currentStock = row.length > 5 ? toBigDecimal(row[5]) : null;
            if (totalSold < HIGH_ROTATION_THRESHOLD) {
                continue;
            }
            BigDecimal dailyDemand = BigDecimal.valueOf(totalSold)
                    .divide(BigDecimal.valueOf(HIGH_ROTATION_LOOKBACK_DAYS), 4, java.math.RoundingMode.HALF_UP);
            BigDecimal coverageDays = currentStock == null || dailyDemand.signum() == 0
                    ? null
                    : currentStock.divide(dailyDemand, 1, java.math.RoundingMode.HALF_UP);
            if (coverageDays != null && coverageDays.compareTo(BigDecimal.valueOf(14)) > 0) {
                continue;
            }
            String urgency;
            if (coverageDays == null) {
                urgency = totalSold >= 50 ? "HIGH" : totalSold >= 25 ? "MEDIUM" : "LOW";
            } else if (coverageDays.compareTo(BigDecimal.valueOf(3)) <= 0) {
                urgency = "HIGH";
            } else if (coverageDays.compareTo(BigDecimal.valueOf(7)) <= 0) {
                urgency = "MEDIUM";
            } else {
                urgency = "LOW";
            }
            String title = coverageDays == null ? "Alta rotacion: " + name : "Cobertura baja: " + name;
            String description = coverageDays == null
                    ? String.format(
                            new Locale("es", "AR"),
                            "Vendio %d unidades en los ultimos %d dias.",
                            totalSold,
                            HIGH_ROTATION_LOOKBACK_DAYS)
                    : String.format(
                            new Locale("es", "AR"),
                            "Vendio %d unidades en %d dias y quedan %s dias de cobertura.",
                            totalSold,
                            HIGH_ROTATION_LOOKBACK_DAYS,
                            coverageDays.toPlainString());

            result.add(new RecommendationDto(
                    TYPE_HIGH_ROTATION + "-" + prodId,
                    TYPE_HIGH_ROTATION,
                    title,
                    description,
                    urgency,
                    "pi pi-chart-line",
                    "/admin/inventory/product/" + prodId + "/lots",
                    "Ver producto",
                    prodId,
                    name,
                    categoryId,
                    categoryName,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    totalSold,
                    null,
                    OffsetDateTime.now()));
        }
        return result;
    }

    /**
     * NO_MOVEMENT rule: products with positive available stock that have not
     * been sold in the last {@value #NO_MOVEMENT_LOOKBACK_DAYS} days, or
     * have never been sold. Urgency tiers:
     * <ul>
     *   <li>HIGH: 90+ days without sales</li>
     *   <li>MEDIUM: 60-89 days</li>
     *   <li>LOW: 30-59 days (or never sold but in stock)</li>
     * </ul>
     */
    private List<RecommendationDto> buildNoMovement(Long branchId, Long productId) {
        List<Object[]> rows = reportRepository.noMovementCandidates(branchId, null);
        LocalDate today = LocalDate.now(REPORT_ZONE);
        List<RecommendationDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long prodId = ((Number) row[0]).longValue();
            if (productId != null && !productId.equals(prodId)) {
                continue;
            }
            String name = (String) row[1];
            Long categoryId = row[2] == null ? null : ((Number) row[2]).longValue();
            String categoryName = (String) row[3];
            String barcode = (String) row[4];
            BigDecimal stock = toBigDecimal(row[5]);
            Object lastSaleRaw = row[6];
            Object oldestStockRaw = row.length > 7 ? row[7] : null;

            if (stock.signum() <= 0) {
                continue;
            }

            Integer daysWithoutSales = null;
            OffsetDateTime activityReference = toOffsetDateTime(lastSaleRaw != null ? lastSaleRaw : oldestStockRaw);
            if (activityReference != null) {
                LocalDate activityDate =
                        activityReference.atZoneSameInstant(REPORT_ZONE).toLocalDate();
                daysWithoutSales = Math.toIntExact(today.toEpochDay() - activityDate.toEpochDay());
                if (daysWithoutSales < NO_MOVEMENT_LOOKBACK_DAYS) {
                    continue;
                }
            }

            String urgency;
            if (daysWithoutSales == null || daysWithoutSales >= 90) {
                urgency = "HIGH";
            } else if (daysWithoutSales >= 60) {
                urgency = "MEDIUM";
            } else {
                urgency = "LOW";
            }

            String description;
            if (daysWithoutSales == null) {
                description = String.format(
                        new Locale("es", "AR"),
                        "Producto sin ventas registradas. Stock disponible: %s.",
                        formatQuantity(stock));
            } else {
                description = String.format(
                        new Locale("es", "AR"),
                        "Sin ventas desde hace %d dias. Stock disponible: %s.",
                        daysWithoutSales,
                        formatQuantity(stock));
            }

            result.add(new RecommendationDto(
                    TYPE_NO_MOVEMENT + "-" + prodId,
                    TYPE_NO_MOVEMENT,
                    "Sin movimiento: " + name,
                    description,
                    urgency,
                    "pi pi-ban",
                    "/admin/inventory/product/" + prodId + "/lots",
                    "Ver producto",
                    prodId,
                    name,
                    categoryId,
                    categoryName,
                    barcode,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    daysWithoutSales,
                    OffsetDateTime.now()));
        }
        return result;
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /**
     * Mirrors the {@code ReportService} branch resolution so the FE behaviour
     * is consistent across the dashboard and the recommendations page.
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

    /** Rejects CUSTOMER users from the recommendations endpoint. */
    private void ensureInternalUser(User user) {
        if (user == null || user.getRole() == Role.CUSTOMER) {
            throw new DomainException(
                    CODE_ACCESS_DENIED, HttpStatus.FORBIDDEN, "Only internal users can access recommendations");
        }
    }

    /** Returns the index of the minimum urgency in the {@link #URGENCY_ORDER} list, or -1 for null. */
    private static int normalizeMinUrgency(String minUrgency) {
        if (minUrgency == null) {
            return -1;
        }
        int idx = URGENCY_ORDER.indexOf(minUrgency.toUpperCase());
        if (idx < 0) {
            throw new DomainException(
                    CODE_INVALID_URGENCY, HttpStatus.BAD_REQUEST, "minUrgency must be one of HIGH, MEDIUM, LOW");
        }
        return idx;
    }

    /** Validates a type filter against the known rule types. */
    private static String normalizeType(String type) {
        String upper = type.toUpperCase();
        if (!URGENCY_ORDER.isEmpty()
                && (TYPE_LOW_STOCK.equals(upper)
                        || TYPE_EXPIRING_SOON.equals(upper)
                        || TYPE_HIGH_ROTATION.equals(upper)
                        || TYPE_NO_MOVEMENT.equals(upper))) {
            return upper;
        }
        throw new DomainException(
                CODE_INVALID_TYPE,
                HttpStatus.BAD_REQUEST,
                "type must be one of LOW_STOCK, EXPIRING_SOON, HIGH_ROTATION, NO_MOVEMENT");
    }

    /** True when the recommendation's urgency index is at or above the minimum index. */
    private static boolean matchesUrgency(String urgency, int minUrgencyIndex) {
        int idx = URGENCY_ORDER.indexOf(urgency);
        // URGENCY_ORDER ranks HIGH first (index 0), then MEDIUM, then LOW.
        // A recommendation is kept when its rank is at most as large as the
        // requested minimum, i.e. when it is at least as severe as the filter.
        return idx >= 0 && idx <= minUrgencyIndex;
    }

    /**
     * Coerces a query result value to BigDecimal. Mirrors the helper inside
     * the repository so the service can read raw {@link Object[]} rows
     * safely.
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
        return new BigDecimal(Objects.toString(value));
    }

    /** Coerces a date value from a JPQL row to {@link LocalDate}. */
    private static LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate ld) {
            return ld;
        }
        if (value instanceof java.sql.Date sql) {
            return sql.toLocalDate();
        }
        if (value instanceof OffsetDateTime odt) {
            return odt.toLocalDate();
        }
        if (value instanceof java.time.Instant instant) {
            return instant.atZone(ZoneOffset.UTC).toLocalDate();
        }
        return null;
    }

    /** Coerces a date/time value from a JPQL row to {@link OffsetDateTime}. */
    private static OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt;
        }
        if (value instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
        if (value instanceof java.time.Instant instant) {
            return instant.atOffset(ZoneOffset.UTC);
        }
        if (value instanceof LocalDate ld) {
            return ld.atStartOfDay(REPORT_ZONE).toOffsetDateTime();
        }
        return null;
    }

    /** Formats a stock quantity stripping trailing zeros for readability. */
    private static String formatQuantity(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() < 0) {
            stripped = stripped.setScale(0);
        }
        return stripped.toPlainString();
    }
}
