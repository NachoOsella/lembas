# Implementation Plan: Reports, Dashboard & Recommendations (Sprint 4)

> Generated: 2026-07-13 (v2 - Updated with real entity fields)
> Based on Jira In-Progress stories: S4-US04 (LEMBAS-58), S4-US05 (LEMBAS-59), S4-US06 (LEMBAS-60)

---

## Table of Contents

1. [Jira Context & Current State](#1-jira-context--current-state)
2. [Real Entity Reference (for queries)](#2-real-entity-reference-for-queries)
3. [Filter & Query Architecture](#3-filter--query-architecture)
4. [Phase A: Backend Core](#4-phase-a-backend-core)
5. [Phase B: Frontend Shared Components](#5-phase-b-frontend-shared-components)
6. [Phase C: Dashboard Page](#6-phase-c-dashboard-page)
7. [Phase D: Cash Reports](#7-phase-d-cash-reports)
8. [Phase E: Recommendations Panel](#8-phase-e-recommendations-panel)
9. [Phase F: Reports Hub Page](#9-phase-f-reports-hub-page)
10. [Phase G: Testing](#10-phase-g-testing)
11. [Phase H: Routes, Navigation & Security](#11-phase-h-routes-navigation--security)
12. [Complete Subtask Mapping](#12-complete-subtask-mapping)
13. [PrimeNG Charts Wrapper Design](#13-primeng-charts-wrapper-design)
14. [Data Export Architecture](#14-data-export-architecture)

---

## 1. Jira Context & Current State

### Sprint 4 Active Board

| Key | Story | Status | SP | Subtasks |
|-----|-------|--------|----|----------|
| LEMBAS-58 | S4-US04: Crear dashboard operativo del dia | In Progress | 5 | 15 |
| LEMBAS-59 | S4-US05: Generar reporte de cierre de caja | In Progress | 3 | 9 |
| LEMBAS-60 | S4-US06: Implementar recomendaciones por reglas | In Progress | 5 | 12 |

### Current Code State

- **Backend `reports/`**: Only 5 package-info stubs. **No services, repos, DTOs, or controllers**.
- **Backend API gaps**: `GET /api/admin/reports/dashboard`, `GET /api/admin/reports/cash-session/{id}`, `GET /api/admin/recommendations` are documented in `docs/05-api/endpoints.md` but **NOT implemented**.
- **Frontend `dashboard/`**: Stub showing "dashboard works!".
- **Frontend `reports/`**: Stub showing "reports works!".
- **No Recommendations component, no Chart wrappers, no Data Export exist**.

---

## 2. Real Entity Reference (for queries)

### `orders` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core reference |
| `order_number` | VARCHAR(50) UNIQUE | Display, export |
| `type` | VARCHAR(20) CHECK (POS, ONLINE) | Sales breakdown |
| `status` | VARCHAR(30) | PENDING_PAYMENT, PAID, PREPARING, READY, DELIVERED, CANCELLED, PAYMENT_FAILED, STOCK_CONFLICT |
| `branch_id` | BIGINT FK | Branch filter |
| `customer_user_id` | BIGINT FK nullable | Customer filter |
| `created_by_user_id` | BIGINT FK nullable | Employee filter |
| `cash_session_id` | BIGINT nullable | POS-cash linking |
| `customer_name_snapshot` | VARCHAR(255) | Order display |
| `customer_email_snapshot` | VARCHAR(255) | Customer contact |
| `customer_phone_snapshot` | VARCHAR(50) | Customer contact |
| `subtotal` | DECIMAL(12,2) | Revenue calc |
| `discount_total` | DECIMAL(12,2) | Discount tracking |
| `total` | DECIMAL(12,2) | Final revenue |
| `notes` | TEXT nullable | Order notes |
| `cancellation_reason` | TEXT nullable | Cancel analysis |
| `paid_at` | TIMESTAMPTZ nullable | Payment timing |
| `prepared_at` | TIMESTAMPTZ nullable | Prep timing |
| `ready_at` | TIMESTAMPTZ nullable | Ready timing |
| `delivered_at` | TIMESTAMPTZ nullable | Delivery timing |
| `cancelled_at` | TIMESTAMPTZ nullable | Cancel timing |
| `created_at` | TIMESTAMPTZ | Date range filter |
| `updated_at` | TIMESTAMPTZ | Last change |

### `order_items` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `order_id` | BIGINT FK | Link to orders |
| `product_id` | BIGINT FK | Product linking |
| `quantity` | DECIMAL(12,3) | Volume analysis |
| `unit_price` | DECIMAL(12,2) | Price analysis |
| `discount_amount` | DECIMAL(12,2) | Discount analysis |
| `subtotal_amount` | DECIMAL(12,2) | Revenue per item |
| `product_name_snapshot` | VARCHAR(255) | Historic name |
| `product_barcode_snapshot` | VARCHAR(100) | Barcode trace |
| `cost_price_snapshot` | DECIMAL(12,2) nullable | Margin analysis |

### `payments` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `order_id` | BIGINT FK | Link to orders |
| `cash_session_id` | BIGINT nullable | POS linking |
| `provider` | VARCHAR(50) CHECK (MERCADO_PAGO, MANUAL, BANK, CARD_TERMINAL) | Provider filter |
| `method` | VARCHAR(50) CHECK (CHECKOUT_PRO, CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD, OTHER) | Method breakdown |
| `status` | VARCHAR(20) CHECK (PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED, EXPIRED, IN_PROCESS) | Status filter |
| `amount` | DECIMAL(12,2) | Revenue calc |
| `currency` | VARCHAR(3) DEFAULT 'ARS' | Currency |
| `provider_payment_id` | VARCHAR(255) nullable | MP trace |
| `approved_at` | TIMESTAMPTZ nullable | Approval time |
| `created_at` | TIMESTAMPTZ | Date filter |
| `metadata` | JSONB nullable | Extra info (cashReceived, etc.) |

### `cash_sessions` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `branch_id` | BIGINT FK | Branch filter |
| `opened_by_user_id` | BIGINT FK | Operator filter |
| `closed_by_user_id` | BIGINT FK nullable | Closer filter |
| `opened_at` | TIMESTAMPTZ | Open time |
| `closed_at` | TIMESTAMPTZ nullable | Close time |
| `opening_cash_amount` | DECIMAL(12,2) | Opening |
| `expected_cash_amount` | DECIMAL(12,2) nullable | Expected |
| `counted_cash_amount` | DECIMAL(12,2) nullable | Counted |
| `cash_difference_amount` | DECIMAL(12,2) nullable | Diff |
| `cash_difference_reason` | TEXT nullable | Reason |
| `status` | VARCHAR(10) CHECK (OPEN, CLOSED) | Status |
| `opening_notes` | TEXT nullable | Notes |
| `closing_notes` | TEXT nullable | Close notes |

### `cash_movements` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `cash_session_id` | BIGINT FK | Session link |
| `created_by_user_id` | BIGINT FK | Operator |
| `type` | VARCHAR(20) CHECK (CASH_IN, CASH_OUT, ADJUSTMENT) | Movement type |
| `method` | VARCHAR(20) CHECK (CASH, TRANSFER, OTHER) | Method |
| `amount` | DECIMAL(12,2) | Amount |
| `reason` | TEXT | Reason |
| `created_at` | TIMESTAMPTZ | Timestamp |

### `stock_lots` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `product_id` | BIGINT FK | Product link |
| `branch_id` | BIGINT FK | Branch filter |
| `supplier_id` | BIGINT nullable | Supplier link |
| `lot_code` | VARCHAR(100) nullable | Lot trace |
| `expiration_date` | DATE nullable | Expiry alerts |
| `initial_quantity` | DECIMAL(12,3) | Initial |
| `quantity_available` | DECIMAL(12,3) | Current stock |
| `unit_cost` | DECIMAL(12,2) | Cost basis |
| `status` | VARCHAR(20) CHECK (ACTIVE, DEPLETED, CANCELLED) | Lot status |

### `stock_movements` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `stock_lot_id` | BIGINT FK | Lot link |
| `product_id` | BIGINT FK | Product |
| `branch_id` | BIGINT FK | Branch |
| `type` | VARCHAR(50) CHECK (PURCHASE_ENTRY, POS_SALE, ONLINE_SALE, CANCELLATION_RETURN, MANUAL_ADJUSTMENT, WASTE, INTERNAL_CONSUMPTION) | Movement type |
| `quantity` | DECIMAL(12,3) signed | Volume |
| `unit_cost_snapshot` | DECIMAL(12,2) nullable | Cost at time |
| `order_id` | BIGINT nullable | Order link |
| `reason` | VARCHAR(500) nullable | Reason |
| `created_by_user_id` | BIGINT nullable | User |
| `created_at` | TIMESTAMPTZ | Timestamp |

### `products` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `category_id` | BIGINT FK nullable | Category filter |
| `name` | VARCHAR(255) | Display |
| `brand_name` | VARCHAR(255) nullable | Brand filter |
| `barcode` | VARCHAR(100) UNIQUE nullable | Barcode |
| `online_status` | VARCHAR(20) | DRAFT/PUBLISHED/PAUSED/HIDDEN |
| `sale_price` | DECIMAL(12,2) | Price |
| `minimum_stock` | INT nullable | Low-stock alerts |
| `active` | BOOLEAN | Active filter |

### `users` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `branch_id` | BIGINT nullable | Branch assignment |
| `email` | VARCHAR(255) | Contact |
| `first_name` | VARCHAR(100) | Display name |
| `last_name` | VARCHAR(100) | Display name |
| `role` | VARCHAR(20) CHECK | RBAC filter |

### `branches` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `name` | VARCHAR(255) | Display |
| `address` | VARCHAR(255) nullable | Info |
| `phone` | VARCHAR(50) nullable | Info |
| `active` | BOOLEAN | Status |

### `categories` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `parent_id` | BIGINT nullable | Hierarchy |
| `name` | VARCHAR(255) | Display |

### `suppliers` Table

| Column | Type | Used For |
|--------|------|----------|
| `id` | BIGSERIAL PK | Core |
| `name` | VARCHAR(255) | Display |
| `contact_name` | VARCHAR(255) nullable | Contact |
| `phone` | VARCHAR(50) nullable | Contact |
| `email` | VARCHAR(255) nullable | Contact |
| `cuit` | VARCHAR(20) UNIQUE nullable | Fiscal |

---

## 3. Filter & Query Architecture

### Dashboard Query Parameters

```
GET /api/admin/reports/dashboard
  ?branchId=1           (optional, ADMIN passes branch, MANAGER/EMPLOYEE forced to their branch)
  &date=2026-07-13      (optional, defaults to today. Allows seeing past days via "ver historico")
  &compareWith=2026-07-12  (optional, for trend comparison, default = previous day)
```

### Cash Session History Query Parameters

```
GET /api/admin/reports/cash-sessions
  ?branchId=1             (optional, ADMIN selects branch, MANAGER/EMPLOYEE forced)
  &from=2026-06-01        (optional, date range start)
  &to=2026-07-13          (optional, date range end)
  &openedByUserId=5       (optional, filter by who opened)
  &closedByUserId=3       (optional, filter by who closed)
  &status=CLOSED          (optional, OPEN or CLOSED)
  &page=0                 (optional, default 0)
  &size=20                (optional, default 20)
  &sort=closedAt,desc     (optional, sorting)
```

### Recommendations Query Parameters

```
GET /api/admin/recommendations
  ?branchId=1             (optional, branch filter)
  &minUrgency=MEDIUM       (optional, filter: HIGH, MEDIUM, LOW. Default = LOW = show all)
  &type=LOW_STOCK          (optional, filter by rule type)
  &productId=42            (optional, filter by product)
  &limit=10                (optional, max results. Default unlimited for full page, 5 for dashboard widget)
```

### Cash Report Detail (existing endpoint)

```
GET /api/admin/reports/cash-session/{sessionId}
  No extra params - single session detail
```

### Filters Available Per Component

| Component | Filters |
|-----------|---------|
| Dashboard | branch (auto-resolved), date (today by default), compare-with (auto) |
| Cash History | branch, date range (from/to), openedBy, closedBy, status, sort |
| Cash Detail Report | (single session by id) |
| Recommendations | branch, minUrgency, type, productId, limit |
| Reports Hub (future) | (navigation only, no data filters) |

### Branch Resolution Logic (reused pattern from CashService)

- **ADMIN**: uses `?branchId=` query param if present, else sees ALL branches consolidated
- **MANAGER**: forced to `user.branch_id`, never sees other branches
- **EMPLOYEE**: forced to `user.branch_id`, never sees other branches

---

## 4. Phase A: Backend Core

### A1. Backend DTOs (`com.dietetica.lembas.reports.dto`)

#### DashboardDto.java

```java
public record DashboardDto(
    // Date context
    LocalDate reportDate,
    Long branchId,                  // null = consolidated (all branches)
    String branchName,              // null when consolidated
    OffsetDateTime generatedAt,

    // --- Stat Cards ---
    DashboardStatCardDto todaySales,         // sum of orders.total where paid_at = today, status in (PAID,PREPARING,READY,DELIVERED)
    DashboardStatCardDto onlineSales,        // sum of orders.total where type=ONLINE and paid_at=today
    DashboardStatCardDto posSales,           // sum of orders.total where type=POS and paid_at=today
    DashboardStatCardDto pendingOrders,      // count of orders where status in (PENDING_PAYMENT, PAID, PREPARING)
    DashboardStatCardDto lowStockProducts,   // count products where active=true and available_stock < minimum_stock
    DashboardStatCardDto expiringLots,       // count stock_lots where expiration_date between today and today+30d and quantity_available > 0
    DashboardStatCardDto todayTransactions,  // count of orders with paid_at=today and type != CANCELLED
    DashboardStatCardDto avgOrderValue,      // avg(orders.total) where paid_at=today
    DashboardStatCardDto totalProducts,      // count of active products
    DashboardStatCardDto totalSuppliers,     // count of active suppliers

    // --- Detailed Data ---
    List<TopProductDto> topProducts,         // top 10 products by items.quantity today (or date range)
    List<SalesByHourDto> salesByHour,        // sales grouped by hour of the day for today
    List<SalesByMethodDto> salesByMethod,    // payment method distribution for today

    // --- Trends (compared to previous period) ---
    BigDecimal salesTrendPercentage,         // vs same day last week or yesterday
    BigDecimal transactionsTrendPercentage,
    BigDecimal avgOrderTrendPercentage
) {}
```

#### DashboardStatCardDto.java

```java
public record DashboardStatCardDto(
    String label,            // "Ventas del dia"
    String value,            // "$45,230.00" (formatted with 2 decimals)
    String subtitle,         // "Ventas confirmadas del dia" (optional description line)
    String trend,            // "UP" | "DOWN" | "FLAT" (optional)
    Double trendPercentage,  // 12.5 (optional, null if no previous data)
    String iconName,         // "pi pi-shopping-cart" (PrimeNG icon class)
    String colorStyle,       // "SUCCESS" | "WARNING" | "DANGER" | "INFO" | "NEUTRAL"
    String link,             // "/admin/orders?status=PAID" (optional, for clickable cards)
    String tooltip           // "Total de ventas confirmadas en el dia de hoy"
) {}
```

#### TopProductDto.java

```java
public record TopProductDto(
    int position,               // 1-based ranking
    Long productId,
    String productName,
    String barcode,
    Long categoryId,
    String categoryName,
    String brandName,
    int quantitySold,           // total unit quantity from order_items
    BigDecimal totalRevenue,    // sum of subtotal_amount
    BigDecimal averagePrice,    // totalRevenue / quantitySold
    String imageUrl             // products.image_url (small thumbnail)
) {}
```

#### SalesByHourDto.java

```java
public record SalesByHourDto(
    int hour,                   // 0-23
    int orderCount,
    BigDecimal totalRevenue,
    int onlineOrders,
    int posOrders
) {}
```

#### SalesByMethodDto.java

```java
public record SalesByMethodDto(
    String method,              // CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD, CHECKOUT_PRO, OTHER
    String methodLabel,         // "Efectivo", "Transferencia", etc.
    BigDecimal totalAmount,
    int transactionCount,
    BigDecimal percentage       // percentage of total sales for this method
) {}
```

#### CashSessionHistoryDto.java

```java
public record CashSessionHistoryDto(
    List<CashSessionSummaryDto> sessions,
    int totalCount,
    int page,
    int size
) {}

public record CashSessionSummaryDto(
    Long id,
    Long branchId,
    String branchName,
    String openedByUserName,
    String closedByUserName,
    OffsetDateTime openedAt,
    OffsetDateTime closedAt,
    BigDecimal openingCashAmount,
    BigDecimal expectedCashAmount,
    BigDecimal countedCashAmount,
    BigDecimal cashDifferenceAmount,
    String cashDifferenceReason,
    String status,
    int totalPayments,
    int totalManualMovements
) {}
```

#### CashReportDto.java (extends what CashSessionDto already provides)

```java
public record CashReportDto(
    Long sessionId,
    String branchName,
    String openedByUserName,
    String closedByUserName,
    OffsetDateTime openedAt,
    OffsetDateTime closedAt,
    CashSessionStatus status,

    // --- Cash amounts ---
    BigDecimal openingCashAmount,
    BigDecimal expectedCashAmount,
    BigDecimal countedCashAmount,
    BigDecimal cashDifferenceAmount,
    String cashDifferenceReason,

    // --- Totals by method (from CashCloseCalculator) ---
    CashTotalsByMethodDto totalsByMethod,

    // --- Extended report ---
    int totalTransactions,              // count of APPROVED payments in session
    int posOrdersCount,                 // count of POS orders linked to session
    BigDecimal totalPosRevenue,         // sum of all APPROVED payment amounts
    List<CashEntryDto> entries,         // unified timeline (already in CashSessionDto)
    List<CashMovementDto> manualMovements, // only manual movements (subset of entries)
    OffsetDateTime generatedAt
) {}
```

#### RecommendationDto.java

```java
public record RecommendationDto(
    // Unique id: rule-type + product-id composite to allow dedup on FE
    String id,

    // --- Type ---
    String type,             // LOW_STOCK | EXPIRING_SOON | HIGH_ROTATION | NO_MOVEMENT

    // --- Display ---
    String title,
    String description,
    String urgency,          // HIGH | MEDIUM | LOW
    String iconName,         // PrimeNG icon

    // --- Action ---
    String link,             // actionable route e.g. /admin/inventory/product/42/lots
    String actionLabel,      // "Ver producto" | "Reponer stock" | "Ver lote"

    // --- Product context ---
    Long productId,
    String productName,
    Long categoryId,
    String categoryName,
    String barcode,

    // --- Type-specific data ---
    // LOW_STOCK
    BigDecimal currentStock,       // stock_lots.quantity_available sum
    Integer minimumStock,          // products.minimum_stock

    // EXPIRING_SOON
    LocalDate expirationDate,      // stock_lots.expiration_date
    Long stockLotId,
    String lotCode,
    BigDecimal lotQuantity,        // stock_lots.quantity_available for that lot

    // HIGH_ROTATION
    Integer last7DaysSales,        // quantity sold in last 7 days

    // NO_MOVEMENT
    Integer daysWithoutSales,      // days since last sale

    // --- Timestamp ---
    OffsetDateTime generatedAt
) {}
```

### A2. Backend Repository (`ReportQueryRepository.java`)

Create a custom repository class with JPA native queries. Some queries already exist partially in existing repositories and can be reused.

#### Queries needed:

**Q1: todaySales()** -- Today's revenue from confirmed orders
```sql
SELECT COALESCE(SUM(o.total), 0)
FROM orders o
WHERE o.paid_at >= :todayStart
  AND o.paid_at < :todayEnd
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
```
- Returns: `BigDecimal totalSales, int orderCount`
- Used for: DashboardStatCardDto `todaySales`, `todayTransactions`

**Q2: salesByType()** -- Split today's sales by POS vs ONLINE
```sql
SELECT o.type, COUNT(*), COALESCE(SUM(o.total), 0)
FROM orders o
WHERE o.paid_at >= :todayStart AND o.paid_at < :todayEnd
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
GROUP BY o.type
```
- Returns: `List<Object[]> {type, count, total}`
- Used for: `onlineSales`, `posSales` stat cards

**Q3: pendingOrders()** -- Pending orders count
```sql
SELECT COUNT(*)
FROM orders o
WHERE o.status IN ('PENDING_PAYMENT', 'PAID', 'PREPARING')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
```
- Focus on non-terminal states that need attention

**Q4: lowStockProducts()** -- Products below minimum stock
```sql
SELECT COUNT(DISTINCT p.id)
FROM products p
WHERE p.active = true
  AND p.minimum_stock IS NOT NULL
  AND (
    SELECT COALESCE(SUM(l.quantity_available), 0)
    FROM stock_lots l
    WHERE l.product_id = p.id
      AND (:branchId IS NULL OR l.branch_id = :branchId)
      AND l.status = 'ACTIVE'
  ) < p.minimum_stock
```
- Also returns the actual product list with stock info

**Q5: expiringLots()** -- Lots expiring within 30 days
```sql
SELECT COUNT(*), COALESCE(SUM(l.quantity_available), 0)
FROM stock_lots l
WHERE l.expiration_date >= CURRENT_DATE
  AND l.expiration_date <= CURRENT_DATE + 30
  AND l.quantity_available > 0
  AND l.status = 'ACTIVE'
  AND (:branchId IS NULL OR l.branch_id = :branchId)
```
- Returns count and total quantity affected

**Q6: topProducts()** -- Top 10 products by sales volume
```sql
SELECT oi.product_id,
       p.name,
       p.barcode,
       p.category_id,
       c.name,
       p.brand_name,
       p.image_url,
       SUM(oi.quantity) as total_qty,
       SUM(oi.subtotal_amount) as total_rev,
       CASE WHEN SUM(oi.quantity) > 0
            THEN SUM(oi.subtotal_amount) / SUM(oi.quantity)
            ELSE 0 END as avg_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.paid_at >= :todayStart AND o.paid_at < :todayEnd
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
GROUP BY oi.product_id, p.name, p.barcode, p.category_id, c.name, p.brand_name, p.image_url
ORDER BY total_qty DESC
LIMIT 10
```

**Q7: avgOrderValue()** -- Average order value today
```sql
SELECT COALESCE(AVG(o.total), 0)
FROM orders o
WHERE o.paid_at >= :todayStart AND o.paid_at < :todayEnd
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
```

**Q8: salesByHour()** -- Sales grouped by hour of the day
```sql
SELECT EXTRACT(HOUR FROM o.paid_at) as hour,
       COUNT(*) as order_count,
       COALESCE(SUM(o.total), 0) as revenue,
       SUM(CASE WHEN o.type = 'ONLINE' THEN 1 ELSE 0 END) as online,
       SUM(CASE WHEN o.type = 'POS' THEN 1 ELSE 0 END) as pos
FROM orders o
WHERE o.paid_at >= :todayStart AND o.paid_at < :todayEnd
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
GROUP BY EXTRACT(HOUR FROM o.paid_at)
ORDER BY hour
```

**Q9: salesByMethod()** -- Payment method distribution
```sql
SELECT p.method,
       COUNT(*) as txn_count,
       COALESCE(SUM(p.amount), 0) as total
FROM payments p
JOIN orders o ON o.id = p.order_id
WHERE p.status = 'APPROVED'
  AND p.approved_at >= :todayStart AND p.approved_at < :todayEnd
  AND (:branchId IS NULL OR o.branch_id = :branchId)
GROUP BY p.method
ORDER BY total DESC
```

**Q10: trendComparison()** -- Compare with previous period
```sql
-- Same query as Q1 but with :previousDayStart/:previousDayEnd instead of today
```
- Returns: previous period totals for trend calculation

**Q11: cashSessionHistory()** -- Filtered list of cash sessions
```sql
SELECT cs.id, cs.branch_id, b.name, u1.first_name||' '||u1.last_name,
       u2.first_name||' '||u2.last_name,
       cs.opened_at, cs.closed_at, cs.opening_cash_amount,
       cs.expected_cash_amount, cs.counted_cash_amount,
       cs.cash_difference_amount, cs.cash_difference_reason,
       cs.status
FROM cash_sessions cs
JOIN branches b ON b.id = cs.branch_id
JOIN users u1 ON u1.id = cs.opened_by_user_id
LEFT JOIN users u2 ON u2.id = cs.closed_by_user_id
WHERE (:branchId IS NULL OR cs.branch_id = :branchId)
  AND (:status IS NULL OR cs.status = :status)
  AND (:openedBy IS NULL OR cs.opened_by_user_id = :openedBy)
  AND (:closedBy IS NULL OR cs.closed_by_user_id = :closedBy)
  AND (:from IS NULL OR cs.opened_at >= :from)
  AND (:to IS NULL OR cs.opened_at < :to)
ORDER BY cs.opened_at DESC
```

**Q12: recommendationLowStock()** -- LOW_STOCK rule
```sql
SELECT p.id, p.name, p.category_id, c.name, p.barcode, p.minimum_stock,
       COALESCE(SUM(l.quantity_available), 0) as stock
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN stock_lots l ON l.product_id = p.id
  AND l.status = 'ACTIVE'
  AND (:branchId IS NULL OR l.branch_id = :branchId)
WHERE p.active = true AND p.minimum_stock IS NOT NULL
GROUP BY p.id, p.name, p.category_id, c.name, p.barcode, p.minimum_stock
HAVING COALESCE(SUM(l.quantity_available), 0) < p.minimum_stock
ORDER BY (p.minimum_stock - COALESCE(SUM(l.quantity_available), 0)) DESC
```

**Q13: recommendationExpiringSoon()** -- EXPIRING_SOON rule
```sql
SELECT l.id, l.product_id, p.name, p.category_id, c.name,
       l.lot_code, l.expiration_date, l.quantity_available
FROM stock_lots l
JOIN products p ON p.id = l.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE l.expiration_date IS NOT NULL
  AND l.expiration_date >= CURRENT_DATE
  AND l.expiration_date <= CURRENT_DATE + 30
  AND l.quantity_available > 0
  AND l.status = 'ACTIVE'
  AND (:branchId IS NULL OR l.branch_id = :branchId)
ORDER BY l.expiration_date ASC
```

**Q14: recommendationHighRotation()** -- HIGH_ROTATION rule
```sql
SELECT oi.product_id, p.name, p.category_id, c.name,
       SUM(oi.quantity) as total_sold_last_7d
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.paid_at >= CURRENT_DATE - 7
  AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
  AND (:branchId IS NULL OR o.branch_id = :branchId)
GROUP BY oi.product_id, p.name, p.category_id, c.name
HAVING SUM(oi.quantity) > 10
ORDER BY total_sold_last_7d DESC
LIMIT 20
```

**Q15: recommendationNoMovement()** -- NO_MOVEMENT rule
```sql
SELECT p.id, p.name, p.category_id, c.name,
       COALESCE(SUM(l.quantity_available), 0) as stock,
       MAX(o.paid_at) as last_sale_date
FROM products p
JOIN stock_lots l ON l.product_id = p.id
  AND l.status = 'ACTIVE'
  AND (:branchId IS NULL OR l.branch_id = :branchId)
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN orders o ON o.id IN (
  SELECT oi2.order_id FROM order_items oi2
  WHERE oi2.product_id = p.id
) AND o.status NOT IN ('CANCELLED')
WHERE p.active = true
GROUP BY p.id, p.name, p.category_id, c.name
HAVING COALESCE(SUM(l.quantity_available), 0) > 0
  AND (MAX(o.paid_at) IS NULL OR MAX(o.paid_at) < CURRENT_DATE - 30)
ORDER BY last_sale_date ASC NULLS FIRST, stock DESC
```

### A3. Backend Service

#### ReportService.java

```java
@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ReportQueryRepository reportRepo;
    private final SecurityContextHelper securityHelper;

    public DashboardDto getDashboard(LocalDate date, Long branchId) {
        // 1. Resolve branchId from current user's role
        Long effectiveBranchId = resolveBranch(branchId);

        // 2. Get current period data
        LocalDate reportDate = date != null ? date : LocalDate.now();
        LocalDate previousDate = reportDate.minusDays(1);

        // 3. Run all queries in a single read tx
        // Execute Q1-Q10 in a batch

        // 4. Build stat cards with trend calculations

        // 5. Return DashboardDto
    }

    public CashReportDto getCashReport(Long sessionId) {
        // Reuses CashService.getSessionById internally
        // Adds extra computed fields: totalTransactions, posOrdersCount
    }

    public CashSessionHistoryDto getCashSessionHistory(
        Long branchId, LocalDate from, LocalDate to,
        Long openedBy, Long closedBy, String status,
        int page, int size, String sort
    ) {
        // Uses ReportQueryRepository.cashSessionHistory(Q11)
        // Paginated, filterable, sortable
    }
}
```

#### RecommendationService.java

```java
@Service
@Transactional(readOnly = true)
public class RecommendationService {

    public List<RecommendationDto> getRecommendations(
        Long branchId, String minUrgency, String type,
        Long productId, Integer limit
    ) {
        List<RecommendationDto> all = new ArrayList<>();

        if (type == null || type.equals("LOW_STOCK"))
            all.addAll(buildLowStock(branchId, productId));
        if (type == null || type.equals("EXPIRING_SOON"))
            all.addAll(buildExpiringSoon(branchId, productId));
        if (type == null || type.equals("HIGH_ROTATION"))
            all.addAll(buildHighRotation(branchId, productId));
        if (type == null || type.equals("NO_MOVEMENT"))
            all.addAll(buildNoMovement(branchId, productId));

        // Filter by minUrgency
        // Sort by urgency (HIGH first), then by type
        // Apply limit if specified
        // Deduplicate by composite id
    }

    private List<RecommendationDto> buildLowStock(Long branchId, Long productId) {
        // Run Q12
        // urgency: stock = 0 -> HIGH, stock < minStock*0.5 -> MEDIUM, else LOW
    }

    private List<RecommendationDto> buildExpiringSoon(Long branchId, Long productId) {
        // Run Q13
        // urgency: <=7 days -> HIGH, 8-14 -> MEDIUM, 15-30 -> LOW
    }

    private List<RecommendationDto> buildHighRotation(Long branchId, Long productId) {
        // Run Q14
        // urgency based on volume relative to all products
        // Top 10% of sellers -> HIGH if over threshold
    }

    private List<RecommendationDto> buildNoMovement(Long branchId, Long productId) {
        // Run Q15
        // urgency: >90 days no sales -> HIGH, >60 -> MEDIUM, >30 -> LOW
    }
}
```

### A4. Backend Controller

#### ReportAdminController.java

```java
@RestController
@RequestMapping("/api/admin/reports")
public class ReportAdminController {

    @GetMapping("/dashboard")
    public DashboardDto getDashboard(
        @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate date,
        @RequestParam(required = false) Long branchId
    ) { ... }

    @GetMapping("/cash-sessions")
    public CashSessionHistoryDto getCashSessionHistory(
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate to,
        @RequestParam(required = false) Long openedBy,
        @RequestParam(required = false) Long closedBy,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "openedAt,desc") String sort
    ) { ... }

    @GetMapping("/cash-session/{id}")
    public CashReportDto getCashReport(@PathVariable Long id) { ... }
}
```

#### RecommendationAdminController.java

```java
@RestController
@RequestMapping("/api/admin/recommendations")
public class RecommendationAdminController {

    @GetMapping
    public List<RecommendationDto> getRecommendations(
        @RequestParam(required = false) Long branchId,
        @RequestParam(required = false, defaultValue = "LOW") String minUrgency,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) Long productId,
        @RequestParam(required = false) Integer limit
    ) { ... }
}
```

---

## 5. Phase B: Frontend Shared Components

### B1. Frontend Models (`shared/models/`)

Create new model files:

**`dashboard.ts`**:

```typescript
export interface DashboardDto {
  reportDate: string;
  branchId: number | null;
  branchName: string | null;
  generatedAt: string;
  todaySales: DashboardStatCardDto;
  onlineSales: DashboardStatCardDto;
  posSales: DashboardStatCardDto;
  pendingOrders: DashboardStatCardDto;
  lowStockProducts: DashboardStatCardDto;
  expiringLots: DashboardStatCardDto;
  todayTransactions: DashboardStatCardDto;
  avgOrderValue: DashboardStatCardDto;
  totalProducts: DashboardStatCardDto;
  totalSuppliers: DashboardStatCardDto;
  topProducts: TopProductDto[];
  salesByHour: SalesByHourDto[];
  salesByMethod: SalesByMethodDto[];
  salesTrendPercentage: number | null;
  transactionsTrendPercentage: number | null;
  avgOrderTrendPercentage: number | null;
}

export interface DashboardStatCardDto {
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'UP' | 'DOWN' | 'FLAT';
  trendPercentage?: number;
  iconName: string;
  colorStyle: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL';
  link?: string;
  tooltip?: string;
}

export interface TopProductDto {
  position: number;
  productId: number;
  productName: string;
  barcode: string | null;
  categoryId: number | null;
  categoryName: string | null;
  brandName: string | null;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  imageUrl: string | null;
}

export interface SalesByHourDto {
  hour: number;
  orderCount: number;
  totalRevenue: number;
  onlineOrders: number;
  posOrders: number;
}

export interface SalesByMethodDto {
  method: string;
  methodLabel: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}
```

**`cash-report.ts`**:

```typescript
export interface CashSessionHistoryDto {
  sessions: CashSessionSummaryDto[];
  totalCount: number;
  page: number;
  size: number;
}

export interface CashSessionSummaryDto {
  id: number;
  branchId: number;
  branchName: string;
  openedByUserName: string;
  closedByUserName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingCashAmount: string;
  expectedCashAmount: string | null;
  countedCashAmount: string | null;
  cashDifferenceAmount: string | null;
  cashDifferenceReason: string | null;
  status: CashSessionStatus;
  totalPayments: number;
  totalManualMovements: number;
}

// CashReportDto extends fields from CashSessionDto
export interface CashReportDto {
  // ... same as CashSessionDto fields ...
  totalTransactions: number;
  posOrdersCount: number;
  totalPosRevenue: string;
  generatedAt: string;
}
```

**`recommendation.ts`**:

```typescript
export type RecommendationType = 'LOW_STOCK' | 'EXPIRING_SOON' | 'HIGH_ROTATION' | 'NO_MOVEMENT';
export type RecommendationUrgency = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RecommendationDto {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  urgency: RecommendationUrgency;
  iconName: string;
  link: string;
  actionLabel: string;
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  barcode: string | null;
  currentStock?: number;
  minimumStock?: number;
  expirationDate?: string;
  stockLotId?: number;
  lotCode?: string;
  lotQuantity?: number;
  last7DaysSales?: number;
  daysWithoutSales?: number;
  generatedAt: string;
}
```

### B2. PrimeNG Chart Wrapper (`shared/components/prime-chart-wrapper.ts`)

Create a generic chart wrapper that adapts PrimeNG (`p-chart` from `primeng/chart`) to the Lembas design system.

**Design system color mapping for Chart.js:**

| DESING.md Token | Chart.js Usage | Hex |
|---|---|---|
| Lembas Leaf Green | Primary dataset, primary bar, line | `#2f8d72` |
| Lembas Forest Green | Secondary dataset, darker variant | `#075f36` |
| Lembas Orange | Loyalty/accent dataset (doughnut segments) | `#f29d52` |
| Mint Leaf Wash | Background fill under line charts | `#d7eadf` |
| Mint Leaf Wash Light | Background fill, light variant | `#e9f3ea` |
| Text Black | Axis labels, legend text | `rgba(0,0,0,0.87)` |
| Text Black Soft | Grid lines, secondary labels | `rgba(0,0,0,0.58)` |
| Red | Negative trends | `#c82014` |
| Amber | Warning state | `#d9822b` |
| Neutral Warm | Chart canvas background | `#f6ead6` |
| Ceramic | Light background | `#e7dbc0` |
| White | Card canvas | `#ffffff` |

**Wrapper interface:**

```typescript
export interface ChartConfig {
  type: 'bar' | 'line' | 'doughnut' | 'polarArea' | 'horizontalBar';
  labels: string[];
  datasets: ChartDatasetConfig[];
  height?: string;              // default: '280px'
  showLegend?: boolean;          // default: true
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  aspectRatio?: number | null;   // null = maintainAspectRatio false
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  options?: DeepPartial<ChartOptions>;
}

export interface ChartDatasetConfig {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
  tension?: number;
}
```

### B3. Data Export Component (`shared/components/data-export.ts`)

Pure TypeScript CSV export with PrimeNG button wrapper:

```typescript
export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportData {
  filename: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
}

// Features:
// - UTF-8 BOM for Excel (Spanish locale compatibility)
// - Auto-quoting for commas, quotes, newlines
// - Filename: {report}_{date}.csv
// - Date formatting: dd/MM/yyyy
// - Number formatting: 1.234,56 (AR locale)
```

### B4. Loading Skeleton + Empty States

Reusable components for all-states pattern:

- `loading-skeleton-dashboard`: 4-column skeleton grid for stat cards + skeleton table for top products + skeleton chart
- `loading-skeleton-table`: Generic p-table skeleton with configurable rows/columns
- `empty-state`: Icon + title + description + optional CTA button (using DESING.md empty state spec)

DESING.md Empty State spec:
- Icon container: `#f6ead6` bg, `#2f8d72` icon color
- CTA button: Leaf Green filled pill, `50px` radius, `scale(0.95)` active

---

## 6. Phase C: Dashboard Page

### C1. Dashboard Service (`services/dashboard.service.ts`)

```typescript
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getDashboard(date?: string, branchId?: number): Observable<DashboardDto> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (branchId != null) params = params.set('branchId', String(branchId));
    return this.http.get<DashboardDto>('/api/admin/reports/dashboard', { params });
  }
}
```

### C2. Dashboard Store (`stores/dashboard.store.ts`)

Using signals:

```typescript
interface DashboardState {
  data: DashboardDto | null;
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
  autoRefreshInterval: number; // ms, default 60000 (1 min)
  selectedDate: string;         // ISO date string
}

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private service = inject(DashboardService);
  private auth = inject(AuthService);

  private state = signal<DashboardState>({...});

  // Computed selectors
  readonly data = computed(() => this.state().data);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly statCards = computed(() => this.extractStatCards(this.state().data));
  readonly topProducts = computed(() => this.state().data?.topProducts ?? []);
  readonly salesByHour = computed(() => this.state().data?.salesByHour ?? []);
  readonly salesByMethod = computed(() => this.state().data?.salesByMethod ?? []);

  // Group stat cards into rows of 4
  readonly statCardRows = computed(() => {
    const cards = this.statCards();
    const rows: DashboardStatCardDto[][] = [];
    for (let i = 0; i < cards.length; i += 4) {
      rows.push(cards.slice(i, i + 4));
    }
    return rows;
  });

  load(date?: string): void { ... }
  refresh(): void { ... }
  setDate(date: string): void { ... }
  startAutoRefresh(): void { ... }
  stopAutoRefresh(): void { ... }
}
```

### C3. Dashboard Stat Card Component (`components/dashboard-stat-card.ts`)

Reusable card showing one metric. Following DESING.md stat card spec:

```
+----------------------------------------------------+
| [icon-bg]  Ventas del dia            [+12% UP]     |
|            $ 45.230,00                             |
|            Ventas confirmadas del dia              |
+----------------------------------------------------+
```

**Props (inputs):**

```typescript
interface DashboardStatCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'UP' | 'DOWN' | 'FLAT';
  trendPercentage?: number;
  colorStyle: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL';
  link?: string;
  tooltip?: string;
  loading?: boolean;
}
```

**DESING.md style mapping:**
- Default stat: metric color `#243a31`, wash `#f7f9f5`
- Success stat: metric color `#6f8d67`, wash `#f7f9f5`
- Warning stat: metric color `#d9822b`, wash `#fff9f0`
- Trend text: `#4a5b55`
- Card: white bg, 12px radius, whisper-soft shadow

### C4. Top Products Table (`components/top-products-table.ts`)

PrimeNG `p-table` with:

| Column | Source | Format |
|--------|--------|--------|
| # | `position` | Rank number |
| Producto | `productName` + `imageUrl` as small thumbnail | Image (40x40, rounded) + name |
| Categoria | `categoryName` | Badge (Info badge spec) |
| Marca | `brandName` | Text |
| Codigo | `barcode` | Mono text |
| Cant. vendida | `quantitySold` | Number with decimal (u.) |
| Total | `totalRevenue` | Currency `$ X.XXX,XX` |
| Precio prom. | `averagePrice` | Currency `$ X.XXX,XX` |

Design follows DESING.md data table spec:
- Header: Mint Leaf Wash Subtle `#eef6f1`, uppercase, weight 800, letter-spacing 0.08em
- Row hover: `rgba(47,141,114,0.045)` + left accent bar `inset 0.25rem 0 0 rgba(47,141,114,0.75)`
- Paginator: Mint Leaf Wash Pale `#f6fbf7`, active page `#2f8d72` on `#dff6ea`
- Card: white bg, 12px radius, whisper-soft shadow

### C5. Sales by Hour Chart (`components/dashboard-charts.ts`)

Bar chart using the PrimeNG wrapper:
- X axis: hours 0-23
- Y axis: total revenue
- Two datasets: POS (Forest Green `#075f36`) + Online (Leaf Green `#2f8d72`)
- Stacked bars

### C6. Payment Method Distribution Chart (`components/dashboard-charts.ts`)

Doughnut chart using the PrimeNG wrapper:
- Segments: CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD, CHECKOUT_PRO
- Color palette: Leaf Green `#2f8d72`, Orange `#f29d52`, Forest Green `#075f36`, Mint Wash `#d7eadf`, Amber `#d9822b`, Ceramic `#e7dbc0`
- Center label: total revenue (custom plugin or overlay)

### C7. Mini Recommendations Panel (`components/dashboard-recommendations.ts`)

Shows top 3-5 recommendations on dashboard:

```
+-------------------------------------------------------+
| Alertas y recomendaciones          [Ver todas >]       |
+-------------------------------------------------------+
| [!] Stock bajo - Granola artesanal | Urgencia: ALTA   |
|     Stock actual: 2, Minimo: 10   | [Ver producto]   |
+-------------------------------------------------------+
| [*] Lote por vencer - Pan nube    | Urgencia: MEDIA  |
|     Vence: 20/07/2026 (7d)        | [Ver lote]       |
+-------------------------------------------------------+
```

- Calls same `/api/admin/recommendations` endpoint with `limit=5`
- Hidden when empty (no recommendations = all good)
- Each item uses DESING.md badge specs:
  - HIGH urgency: Danger badge (red)
  - MEDIUM urgency: Warning badge (amber)
  - LOW urgency: Info badge (green)

### C8. AdminDashboardPageComponent Layout

```
+-----------------------------------------------------------+
| Dashboard Operativo              [15/07/2026] [Refrescar]  |
| Sucursal: Todas (o nombre)       [Ult. act.: 12:34:56]    |
+-----------------------------------------------------------+
| [StatCard] [StatCard] [StatCard] [StatCard]                |
| Ventas del  Online del   POS del dia    Pedidos pend.     |
| dia                                                        |
+-----------------------------------------------------------+
| [StatCard] [StatCard] [StatCard] [StatCard]                |
| Stock bajo  Lotes x vencer Transacciones Ticket promedio  |
+-----------------------------------------------------------+
| [StatCard] [StatCard]                                     |
| Productos   Proveedores                                   |
+-----------------------------------------------------------+
| [Ventas por hora - Bar Chart]  | [Metodos de pago - Donut]|
|                                |                           |
+--------------------------------+---------------------------+
| [Top 10 Productos - DataTable]                             |
+-----------------------------------------------------------+
| [Alertas y recomendaciones - Mini Panel]                   |
+-----------------------------------------------------------+
```

---

## 7. Phase D: Cash Reports

### D1. CashSessionHistoryPageComponent

List of closed cash sessions with filters:

**Filters (top toolbar):**
- Date range: `p-calendar` with selectionMode="range" or two separate date inputs
- Branch: `p-dropdown` with branch list (ADMIN only, MANAGER/EMPLOYEE forced)
- Opened by: `p-dropdown` with user list (filtered to employees who opened sessions)
- Closed by: `p-dropdown` with user list
- Status: `p-dropdown` (CLOSED, OPEN) -- defaults to CLOSED
- Search: `p-inputtext` for searching by operator name

**Table columns:**

| Column | Source | Format/Component |
|--------|--------|-----------------|
| Fecha apertura | `openedAt` | `short-date-ar` pipe: `15/07/2026 09:30` |
| Fecha cierre | `closedAt` | `short-date-ar` pipe |
| Sucursal | `branchName` | Text |
| Abrio | `openedByUserName` | Text |
| Cerro | `closedByUserName` | Text or "-" |
| Esperado | `expectedCashAmount` | Currency `$ X.XXX,XX` |
| Contado | `countedCashAmount` | Currency `$ X.XXX,XX` |
| Diferencia | `cashDifferenceAmount` | Colored: green `#2f8d72` if >= 0, red `#c82014` if < 0 |
| Motivo dif. | `cashDifferenceReason` | Text or tooltip |
| Pagos | `totalPayments` | Number |
| Accion | -- | Button "Ver detalle" |


**States:**
- Loading: p-table skeleton with `p-skeleton`
- Empty: "No hay sesiones de caja registradas" with empty state icon
- Error: error alert with retry button

### D2. CashSessionDetailReportPageComponent

Complete report of a single cash session.

**Header section:**
```
+-----------------------------------------------------------+
| Reporte de Cierre de Caja              [Exportar CSV]     |
+-----------------------------------------------------------+
| Sucursal: Sucursal Centro                                  |
| Abierto por: Juan Perez - 15/07/2026 09:30                 |
| Cerrado por: Maria Gomez - 15/07/2026 19:45                |
| Estado: CERRADO                                            |
+-----------------------------------------------------------+
```

**Cash summary cards (3 stat cards):**
| Expected | Counted | Difference |
|----------|---------|------------|
| `$ 45.000,00` | `$ 45.500,00` | `$ 500,00` (+) |
| Info badge style | Info badge style | Success/green if >=0, Danger/red if <0 |

If difference != 0, show reason below.

**Totals by payment method (table + doughnut chart):**

| Metodo | Monto | % | Transacciones |
|--------|-------|---|---------------|
| Efectivo (CASH) | $ 25.000,00 | 55.6% | 18 |
| Transferencia | $ 10.000,00 | 22.2% | 5 |
| Debito | $ 5.500,00 | 12.3% | 3 |
| Credito | $ 4.500,00 | 10.0% | 2 |

Dooughnut chart showing the distribution.

**Manual movements table:**

| Tipo | Metodo | Monto | Motivo | Registrado por | Hora |
|------|--------|-------|--------|----------------|------|
| CASH_IN | CASH | $ 5.000,00 | Retiro para cambio | Juan P. | 12:30 |
| CASH_OUT | CASH | $ 500,00 | Pago proveedor | Maria G. | 15:00 |

**Timeline entries (unified list from `entries`):**
Accordion or scrollable list showing `CashEntryDto` items chronologically.

**Export button:** Download CSV with full session report.

### D3. Routes

```
/admin/cash/history                -> CashSessionHistoryPageComponent (lazy)
/admin/cash/history/:sessionId     -> CashSessionDetailReportPageComponent (lazy)
```

Must be registered BEFORE `/admin/cash/:id` in the routes array (first-match strategy).

---

## 8. Phase E: Recommendations Panel

### E1. RecommendationsPanelComponent (full page)

**Filters (top toolbar):**
- Type: `p-selectButton` or `p-dropdown` with ALL, LOW_STOCK, EXPIRING_SOON, HIGH_ROTATION, NO_MOVEMENT
- Urgency: `p-selectButton` with ALL, HIGH, MEDIUM, LOW
- Branch: `p-dropdown` (ADMIN only)
- Search: `p-inputtext` for searching by product name

**Results area:**
Grouped by type, each with a header:

```
LOW_STOCK (3) ──────────────────────────────────────────

[!] Granola Artesanal x2    [STOCK: 2] [MIN: 10] [ALTA] [Ver producto]
[!] Pan Nube                [STOCK: 5] [MIN: 8]  [MEDIA] [Ver producto]

EXPIRING_SOON (2) ──────────────────────────────────────

[*] Leche de Almendras (1 lote) [VENCE: 18/07/2026] [ALTA] [Ver lote]
[*] Granola clasica (1 lote)    [VENCE: 28/07/2026] [BAJA] [Ver lote]

HIGH_ROTATION (1) ──────────────────────────────────────

[^] Granola Artesanal    [70 uds/7d] [BAJA] [Ver producto]
```

Each recommendation card shows:
- Icon (type-specific, using PrimeNG icons):
  - LOW_STOCK: `pi pi-exclamation-triangle`
  - EXPIRING_SOON: `pi pi-calendar-times`
  - HIGH_ROTATION: `pi pi-chart-line`
  - NO_MOVEMENT: `pi pi-ban`
- Title (product name)
- Description (context-specific, see DTO fields)
- Urgency badge (Danger/Warning/Info from DESING.md badge spec)
- Action button: `p-button` with `link` routerLink

**States:**
- Loading: skeleton list with 5 placeholder items
- Empty: "No hay recomendaciones. Todo en orden!" with success icon
- Error: error alert
- No results after filtering: "No se encontraron recomendaciones con esos filtros"

### E2. Integration with Dashboard

The dashboard mini panel (C5) calls the same `/api/admin/recommendations` endpoint with `limit=5` and shows top 5 sorted by urgency. Clicking "Ver todas" navigates to `/admin/recommendations`.

---

## 9. Phase F: Reports Hub Page

### F1. ReportsPageComponent (was ReportsComponent stub)

Turn empty `ReportsComponent` into a central navigation hub:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  <!-- Card 1 -->
  <p-card styleClass="...">
    <ng-template pTemplate="header">
      <i class="pi pi-sliders-h text-4xl text-green-700"></i>
    </ng-template>
    <h3>Dashboard Operativo</h3>
    <p>Resumen diario de ventas, stock, y alertas.</p>
    <button pButton label="Ir al Dashboard" routerLink="/admin/dashboard"></button>
  </p-card>

  <!-- Card 2 -->
  <p-card ...>
    <i class="pi pi-wallet text-4xl text-green-700"></i>
    <h3>Reporte de Cierre de Caja</h3>
    <p>Historial de sesiones de caja y detalle por cierre.</p>
    <button pButton ... routerLink="/admin/cash/history">Ver Reportes</button>
  </p-card>

  <!-- Card 3 -->
  <p-card ...>
    <i class="pi pi-lightbulb text-4xl text-green-700"></i>
    <h3>Recomendaciones</h3>
    <p>Alertas de stock bajo, lotes por vencer, rotacion y mas.</p>
    <button pButton ... routerLink="/admin/recommendations">Ver Recomendaciones</button>
  </p-card>

  <!-- Future cards (placeholder, disabled or coming soon) -->
  <p-card ... [styleClass]="'opacity-50'">
    <h3>Reporte de Ventas</h3>
    <p>Analisis de ventas por periodo, producto y metodo de pago.</p>
    <p-tag value="Proximamente"></p-tag>
  </p-card>
</div>
```

---

## 10. Phase G: Testing

### G1. Backend Tests (JUnit5 + AssertJ)

**ReportServiceTest:**
- `getDashboard` returns correct stat values for a day with sales
- `getDashboard` returns zeros when no data for the day
- `getDashboard` filters by branch correctly
- `getDashboard` branch resolution: ADMIN sees all, MANAGER sees own branch
- `getDashboard` trend calculation: UP when today > yesterday
- `getDashboard` trend calculation: DOWN when today < yesterday
- `getDashboard` trend calculation: FLAT when same
- `getCashReport` returns correct totals by method
- `getCashReport` throws `CASH_SESSION_NOT_FOUND` for invalid id
- `getCashSessionHistory` paginates correctly
- `getCashSessionHistory` filters by date range
- `getCashSessionHistory` filters by user

**RecommendationServiceTest:**
- LOW_STOCK: products below minimum_stock are detected
- LOW_STOCK: urgency HIGH when stock = 0
- LOW_STOCK: urgency MEDIUM when stock < minimum_stock * 0.5
- EXPIRING_SOON: lots expiring within 30 days are detected
- EXPIRING_SOON: urgency HIGH when <= 7 days
- HIGH_ROTATION: top sellers in last 7 days appear
- NO_MOVEMENT: products without recent sales appear
- Multiple rules match the same product (deduplication)
- No recommendations when everything is healthy
- Type filter works (only LOW_STOCK)
- MinUrgency filter works (HIGH only)
- Limit parameter works

**Controller tests (@WebMvcTest):**
- `GET /api/admin/reports/dashboard` returns 200
- `GET /api/admin/reports/dashboard?branchId=1` filters correctly
- `GET /api/admin/reports/cash-session/{id}` returns 200
- `GET /api/admin/reports/cash-session/{id}` returns 404 for unknown
- `GET /api/admin/reports/cash-sessions` returns paginated list
- `GET /api/admin/recommendations` returns 200
- `GET /api/admin/recommendations?type=LOW_STOCK` filters correctly
- Unauthenticated requests return 401
- CUSTOMER role gets 403 on admin endpoints

### G2. Frontend Tests (Vitest + jsdom)

**AdminDashboardPageComponent:**
- Renders loading skeleton initially
- Renders stat cards after data loads
- Renders top products table
- Renders sales chart
- Shows error state on HTTP failure
- Shows empty state when no data
- Refresh button triggers reload
- Date filter calls service with correct param
- Auto-refresh interval starts/cleans up

**DashboardStatCardComponent:**
- Renders label, value, icon
- Shows/hides trend indicator
- Applies correct color class
- Shows loading skeleton
- Card click navigates when link provided

**TopProductsTableComponent:**
- Renders all rows from data
- Formats currency with AR locale
- Shows image thumbnail
- Shows empty state

**PrimeChartWrapperComponent:**
- Renders p-chart with correct type
- Applies Lembas theme colors
- Shows loading skeleton
- Shows empty state fallback

**DataExportComponent:**
- Generates CSV content correctly
- Filename includes report name + date
- UTF-8 BOM present
- CSV escapes commas and quotes

**CashSessionHistoryComponent:**
- Renders table with sessions
- Date range filter works
- Branch filter works
- Difference coloring: green >= 0, red < 0
- Navigates to detail on row click
- Loading/empty/error states

**CashSessionDetailComponent:**
- Shows header with session info
- Renders cash summary cards
- Shows totals by method table + chart
- Shows manual movements table
- Export button triggers CSV download

**RecommendationsPanelComponent:**
- Groups by type correctly
- Urgency filter works
- Type filter works
- Branch filter works
- Empty state renders
- Action buttons have correct routerLink
- Loading skeleton during fetch

---

## 11. Phase H: Routes, Navigation & Security

### H1. Route Updates (`admin.routes.ts`)

```typescript
export default [
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: ... },

      // ... existing routes (categories, products, inventory, etc.) ...

      // Reports sub-routes
      {
        path: 'cash/history',
        loadComponent: () => import('./reports/cash-history/cash-session-history')
          .then(m => m.CashSessionHistoryPageComponent),
      },
      {
        path: 'cash/history/:sessionId',
        loadComponent: () => import('./reports/cash-detail/cash-session-detail')
          .then(m => m.CashSessionDetailReportPageComponent),
      },
      {
        path: 'recommendations',
        loadComponent: () => import('./reports/recommendations/recommendations-panel')
          .then(m => m.RecommendationsPanelComponent),
      },
      { path: 'reports', loadComponent: ... },

      // KEEP this AFTER cash/history routes (Angular first-match)
      { path: 'cash/:id', loadComponent: ... },
    ],
  },
] as Routes;
```

### H2. Navigation Menu Updates

Update admin-layout sidebar to include:
- "Dashboard" (already there, keep as first item)
- "Reportes" section or dropdown:
  - "Dashboard" (already there)
  - "Reporte de Caja" -> `/admin/cash/history`
  - "Recomendaciones" -> `/admin/recommendations`

### H3. Security

- All report/recommendation endpoints: `.anyRequest().authenticated()` already covers them
- Role:
  - ADMIN: sees all branches, can pass `?branchId=` param
  - MANAGER: forced to own branch, cannot see other branches
  - EMPLOYEE: same as MANAGER
- Frontend: `authGuard` + `adminGuard` protects `/admin/*` routes
- No public exposure of report data

---

## 12. Complete Subtask Mapping

### S4-US04: Dashboard (LEMBAS-58, 5 SP) -- 15 subtasks

| # | Key | Title | Phase | Files to create/modify | SP |
|---|-----|-------|-------|----------------------|----|
| 01 | LEMBAS-328 | Crear ReportService.dashboard() | A3 | `ReportService.java` | 1 |
| 02 | LEMBAS-329 | Crear queries agregadas ventas por tipo y dia | A2 | `ReportQueryRepository.java` | 1.5 |
| 03 | LEMBAS-330 | Crear query productos mas vendidos (Q6) | A2 | `ReportQueryRepository.java` | 0.5 |
| 04 | LEMBAS-331 | Crear query pedidos pendientes (Q3) | A2 | `ReportQueryRepository.java` | 0.5 |
| 05 | LEMBAS-569 | Crear tabla productos top (C4) | C4 | `top-products-table.ts/html/css`, `top-products-table.spec.ts` | 1 |
| 06 | LEMBAS-570 | Filtrar datos segun rol (solo sucursal) | A3, H3 | `ReportService.java`, `RecommendationService.java` | 0.5 |
| 07 | LEMBAS-573 | Actualizar periodica o boton refrescar | C2 | `dashboard.store.ts`, `dashboard.service.ts` | 0.5 |
| 08 | LEMBAS-566 | Crear AdminDashboardPageComponent | C8 | `dashboard.ts/html/css`, `dashboard.spec.ts` | 1.5 |
| 09 | LEMBAS-567 | Crear DashboardCardComponent reutilizable | C3 | `dashboard-stat-card.ts/html/css`, `dashboard-stat-card.spec.ts` | 1 |
| 10 | LEMBAS-574 | Ruta /admin/dashboard como pagina inicio | H1 | `admin.routes.ts` | 0.5 |
| 11 | LEMBAS-568 | Mostrar cards: ventas, ordenes, stock bajo, lotes | C1-C3 | `dashboard.html`, `dashboard.store.ts` | 1 |
| 12 | LEMBAS-571 | Skeleton loading mientras cargan cards | B4 | `loading-skeleton-dashboard.ts/html/css` | 0.5 |
| 13 | LEMBAS-572 | Estado empty sin datos del dia | B4 | `empty-state.ts/html/css` | 0.5 |
| 14 | LEMBAS-333 | Tests agregacion por sucursal y rol | G1 | `ReportServiceTest.java` | 1 |
| 15 | LEMBAS-575 | Tests unitarios componentes frontend | G2 | `dashboard.spec.ts`, `dashboard-stat-card.spec.ts`, `top-products-table.spec.ts` | 1 |

### S4-US05: Cash Report (LEMBAS-59, 3 SP) -- 9 subtasks + extras

| # | Key | Title | Phase | Files to create/modify | SP |
|---|-----|-------|-------|----------------------|----|
| 01 | LEMBAS-334 | Implementar CashReportDto | A1 | `CashReportDto.java`, `CashSessionHistoryDto.java`, `CashSessionSummaryDto.java` | 0.5 |
| 02 | LEMBAS-335 | Query totalsByMethod desde payments | A2 | `ReportQueryRepository.java` (reuses CashCloseCalculator) | 0.5 |
| 03 | LEMBAS-576 | CashSessionHistoryPageComponent | D1 | `cash-session-history.ts/html/css`, `cash-session-history.spec.ts` | 1.5 |
| 04 | LEMBAS-577 | CashSessionDetailReportPageComponent | D2 | `cash-session-detail.ts/html/css`, `cash-session-detail.spec.ts` | 1.5 |
| 05 | LEMBAS-580 | Rutas /admin/cash/history, /admin/cash/history/:sessionId | H1 | `admin.routes.ts` | 0.5 |
| 06 | LEMBAS-578 | Diferencia color verde/rojo y motivo | D2 | `cash-session-detail.html`, DESING.md color classes | 0.5 |
| 07 | LEMBAS-579 | Estados: loading, empty (sin cierres), error | D1, D2 | `cash-session-history.ts`, `cash-session-detail.ts` | 0.5 |
| 08 | LEMBAS-339 | Tests totales por CASH/QR/TRANSFER/TARJETAS | G1 | `CashCloseCalculatorTest.java`, `ReportServiceTest.java` | 0.5 |
| 09 | LEMBAS-581 | Tests unitarios componentes cash | G2 | `cash-session-history.spec.ts`, `cash-session-detail.spec.ts` | 1 |

### S4-US06: Recommendations (LEMBAS-60, 5 SP) -- 12 subtasks

| # | Key | Title | Phase | Files to create/modify | SP |
|---|-----|-------|-------|----------------------|----|
| 01 | LEMBAS-340 | Crear RecommendationService rule-based | A3 | `RecommendationService.java` | 1.5 |
| 02 | LEMBAS-341 | Regla LOW_STOCK (Q12) | A3 | `RecommendationService.java` | 0.5 |
| 03 | LEMBAS-342 | Regla EXPIRING_SOON (Q13) | A3 | `RecommendationService.java` | 0.5 |
| 04 | LEMBAS-343 | Regla HIGH_ROTATION (Q14) | A3 | `RecommendationService.java` | 0.5 |
| 05 | LEMBAS-344 | Regla NO_MOVEMENT (Q15) | A3 | `RecommendationService.java` | 0.5 |
| 06 | LEMBAS-584 | Ocultar panel si no hay recomendaciones | E1 | `recommendations-panel.html` | 0.5 |
| 07 | LEMBAS-585 | Integrar en dashboard como seccion secundaria | C5 | `dashboard-recommendations.ts/html/css` | 0.5 |
| 08 | LEMBAS-582 | Crear RecommendationsPanelComponent | E1 | `recommendations-panel.ts/html/css`, `recommendations-panel.spec.ts` | 1.5 |
| 09 | LEMBAS-586 | Ruta /admin/recommendations | H1 | `admin.routes.ts` | 0.5 |
| 10 | LEMBAS-583 | Icono, titulo, descripcion, urgencia color, link | E1 | `recommendations-panel.html` | 1 |
| 11 | LEMBAS-346 | Tests de cada regla con datos controlados | G1 | `RecommendationServiceTest.java` | 1 |
| 12 | LEMBAS-587 | Tests unitarios del panel de recomendaciones | G2 | `recommendations-panel.spec.ts` | 1 |

### Enhancement Subtasks (NEW - not in original Jira but needed)

| # | Description | Phase | Files | SP |
|---|-------------|-------|-------|----|
| E1 | Crear PrimeChartWrapper adaptado a DESING.md | B2 | `prime-chart-wrapper.ts/html/css`, `prime-chart-wrapper.spec.ts` | 1.5 |
| E2 | Crear DataExportComponent (CSV export) | B3 | `data-export.ts/html/css`, `data-export.spec.ts` | 1 |
| E3 | Crear graficos dashboard (ventas x hora + metodos pago) | C5, C6 | `dashboard-charts.ts/html/css` | 1 |
| E4 | Crear ReportsPageComponent (hub central) | F1 | `reports.ts/html/css` | 0.5 |
| E5 | Filtros fecha, sucursal, usuario en historial de caja | D1, A2 | Q11, `cash-session-history.ts/html` | 0.5 |
| E6 | Export CSV en cash history + detail | D1, D2, B3 | `data-export.ts`, integration | 0.5 |
| E7 | Dashboard stat cards con tendencias (%) | C3, A2 | Q10, `dashboard-stat-card.ts/html` | 1 |
| E8 | avgOrderValue + totalProducts + totalSuppliers al dashboard | A1, C1 | `DashboardDto.java`, dashboard | 0.5 |
| E9 | DTOs frontend: dashboard.ts, cash-report.ts, recommendation.ts | B1 | Model files | 0.5 |
| E10 | Crear dashboard.store.ts con signals + auto-refresh | C2 | `dashboard.store.ts` | 1 |

---

## 13. PrimeNG Charts Wrapper Design

### Theme Configuration

The wrapper applies these Chart.js defaults for every chart:

```typescript
const LEMBAS_CHART_THEME = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  colors: {
    leafGreen: '#2f8d72',
    forestGreen: '#075f36',
    orange: '#f29d52',
    mintWash: '#d7eadf',
    mintLight: '#e9f3ea',
    red: '#c82014',
    amber: '#d9822b',
    text: 'rgba(0,0,0,0.87)',
    textSoft: 'rgba(0,0,0,0.58)',
    cream: '#f6ead6',
    ceramic: '#e7dbc0',
  },
  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 13 },
          color: 'rgba(0,0,0,0.87)',
          padding: 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleFont: { family: "'Plus Jakarta Sans', system-ui, sans-serif", weight: '600' },
        bodyFont: { family: "'Plus Jakarta Sans', system-ui, sans-serif" },
        titleColor: 'rgba(0,0,0,0.87)',
        bodyColor: 'rgba(0,0,0,0.87)',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 12 },
          color: 'rgba(0,0,0,0.58)',
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        beginAtZero: true,
        ticks: {
          font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 12 },
          color: 'rgba(0,0,0,0.58)',
          callback: (value: any) => '$ ' + value.toLocaleString('es-AR'),
        },
      },
    },
  },
};
```

### Chart-Type Color Palettes

| Chart Type | Palette |
|---|---|
| Bar (single) | Leaf Green `#2f8d72` fills |
| Bar (stacked) | Leaf Green `#2f8d72` + Forest Green `#075f36` |
| Line (single) | Leaf Green line, Mint Wash `#d7eadf` area fill |
| Doughnut | `#2f8d72`, `#f29d52`, `#075f36`, `#d7eadf`, `#d9822b`, `#e7dbc0` |
| PolarArea | `#2f8d72`, `#f29d52`, `#075f36`, `#d7eadf`, `#d9822b` |
| HorizontalBar | Leaf Green `#2f8d72` fills, sorted descending |

### Available Chart Types on Dashboard

| Chart | Type | Location | Data Source |
|---|---|---|---|
| Ventas por hora | Stacked bar | Dashboard | `SalesByHourDto[]` |
| Metodos de pago | Doughnut | Dashboard | `SalesByMethodDto[]` |
| Totales por metodo (cash detail) | Doughnut | Cash detail report | `CashTotalsByMethodDto` |

---

## 14. Data Export Architecture

### Pure TypeScript CSV Generator

No external dependencies. Used across all components with exported data.

```typescript
/** Main export function called by any component. */
function exportToCsv(data: ExportData): void {
  const BOM = '\uFEFF'; // ES Excel UTF-8 support
  const headers = data.columns.map(c => escapeCsv(c.label)).join(',');
  const rows = data.rows.map(row =>
    data.columns.map(col => {
      const val = String(row[col.key] ?? '');
      return escapeCsv(val);
    }).join(',')
  );
  const content = BOM + headers + '\n' + rows.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(data.filename)}_${todayFormatted()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function todayFormatted(): string {
  return new Date().toISOString().slice(0, 10); // yyyy-MM-dd
}
```

### Export Points Mapping

| Component | Export Data | Filename |
|---|---|---|
| Dashboard | Top products table | `productos_top` |
| Dashboard | Full dashboard data | `dashboard_operativo` |
| Cash History | Session list (filtered) | `historial_cierres_caja` |
| Cash Detail | Full session report | `reporte_cierre_caja_{sessionId}` |
| Recommendations | All recommendations (filtered) | `recomendaciones` |

### Localization

All numbers formatted in Spanish locale (`es-AR`):
- Currency: `$ 1.234,56`
- Numbers: `1.234,56`
- Dates: `15/07/2026`
- Times: `09:30`
- Datetimes: `15/07/2026 09:30`

Using Angular's `LOCALE_ID` or `formatCurrency`/`formatDate` with locale `es-AR`.

---

## Execution Order Recommendation

Phases with parallelism opportunities:

```
                  Phase A1 (DTOs)
                       |
                  Phase A2 (Queries)
                       |
                  Phase A3 (Services) ──────> Phase A4 (Controllers)
                       |                            |
                  Phase B1 (FE Models)      Phase B2 (Chart Wrapper)
                       |                            |
                  Phase B3 (Data Export)    Phase C2 (Store)
                       |                       /    |    \
                  Phase B4 (Skeleton/Empty)   C3   C4    C5
                       \                     /     |      |
                        Phase C8 (Dashboard Layout)       |
                              |                          |
                         Phase D1 (Cash History)    Phase E1 (Rec. Panel)
                              |                          |
                         Phase D2 (Cash Detail)          |
                              \                         /
                               Phase F1 (Reports Hub)
                                    |
                               Phase H1 (Routes)
                                    |
                               Phase G (Tests ALL)
```

**Parallel tracks:**
- Track 1 (Backend): A1 -> A2 -> A3 -> A4 (must be sequential)
- Track 2 (Shared FE): B1, B2, B3, B4 (can be parallel)
- Track 3 (Dashboard FE): C1 -> C2 -> C3 -> C4 -> C5 -> C8 (mostly sequential)
- Track 4 (Cash FE): D1 -> D2 (sequential)
- Track 5 (Recs FE): E1 (can start after A3)
- Track 6 (Hub + Routes): F1 -> H1 (after all FE components)
- Track 7 (Tests): G1 + G2 (continuous, per component)
