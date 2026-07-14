# API Endpoints

## Auth (public)

```
POST /api/auth/register
  Request:  { firstName, lastName, email, password, phone? }
  Response: { token, refreshToken, user } (201)
  Errors:   EMAIL_DUPLICATED (409), VALIDATION_ERROR (400)

POST /api/auth/login
  Request:  { email, password }
  Response: { token, refreshToken, user }
  Errors:   INVALID_CREDENTIALS (401), ACCOUNT_DISABLED (403)

POST /api/auth/refresh
  Request:  { refreshToken }
  Response: { token, refreshToken, user }
  Errors:   INVALID_REFRESH_TOKEN (401)

GET /api/auth/me
  Headers:  Authorization: Bearer <token>
  Response: { token: null, refreshToken: null, user: { id, email, firstName, lastName, role, branchId, branchName } }
```

## Public store (no auth)

```
GET /api/store/products?q=&categoryId=&branchId=&page=&size=
  Response: PaginatedResponse<ProductSummaryDto>
  Notes:    Only onlineStatus=PUBLISHED. When branchId is present, returns availableStock calculated from active stock_lots for that branch.

GET /api/store/products/{id}?branchId=
  Response: ProductDetailDto
  Errors:   PRODUCT_NOT_FOUND (404)

GET /api/store/categories
  Response: [ { id, name, productCount } ]

GET /api/store/branches
  Response: [ { id, name, address, phone, active } ]
  Notes:    Active pickup branches. Used by the public store branch selector.

GET /api/store/terms
  Response: TermsDto { title, lastUpdated, intro, sections: [ { title, paragraphs: [...], bullets: [...] } ] }
  Notes:    Public, read-only terms and conditions. Sourced from LegalContentService.

GET /api/store/faq
  Response: FaqDto { title, intro, items: [ { id, question, answer, category } ] }
  Notes:    Public, read-only FAQ. Sourced from LegalContentService.
```

## Customer (role CUSTOMER)

```
GET /api/customer/profile
  Response: { id, firstName, lastName, email, phone, createdAt }

PATCH /api/customer/profile
  Request:  { firstName?, lastName?, phone? }
  Response: { id, firstName, lastName, email, phone }

POST /api/customer/orders
  Request:  { branchId, items: [ { productId, quantity } ], notes? }
  Response: OrderCreatedDto { id, orderNumber, status: "PENDING_PAYMENT", total } (201)
  Notes:    Creates an ONLINE pickup order and a PENDING Mercado Pago payment. It validates stock but does not reserve or deduct stock.
  Errors:   INSUFFICIENT_STOCK (409), PRODUCT_NOT_FOUND (404), BRANCH_NOT_FOUND (404)

GET /api/customer/orders
  Response: [ OrderSummaryDto ]

GET /api/customer/orders/{id}
  Response: OrderDetailDto (with payments)
  Errors:   ORDER_NOT_FOUND (404), FORBIDDEN (403)

POST /api/customer/orders/{orderId}/checkout/mp
  Response: { initPoint, preferenceId }
  Errors:   ORDER_INVALID_STATE (409)
```

## Admin (roles ADMIN, MANAGER, EMPLOYEE)

The URL space is restricted to internal roles, and controllers apply the operation-level matrix:

- `EMPLOYEE`: POS, cash register, order preparation/cancellation, stock operations, and merchandise receipts in the assigned branch.
- `MANAGER`: employee operations plus branch-scoped management, suppliers, purchasing, pricing, and reports.
- `ADMIN`: global access, user/branch management, and all administrative operations.
- Reports and recommendations are not available to `EMPLOYEE`; catalog, supplier, purchasing-order, pricing, and user administration remain restricted to management roles.

### Products

```
GET    /api/admin/products?q=&categoryId=&onlineStatus=&page=&size=
POST   /api/admin/products
PUT    /api/admin/products/{id}
PATCH  /api/admin/products/{id}/status  Request: { onlineStatus }
DELETE /api/admin/products/{id}
```

### Categories

```
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/{id}
DELETE /api/admin/categories/{id}
```

### Stock

```
GET    /api/admin/stock/lots?productId=&branchId=&expiringSoon=
POST   /api/admin/stock/receipts     Request: { purchaseOrderId, invoiceNumber?, notes?, items: [{ purchaseOrderItemId, quantityReceived, unitCost, lotCode?, expirationDate? }] }
POST   /api/admin/stock/deductions   Request: { productId, branchId, quantity, reason? }
POST   /api/admin/stock/adjustments  Request: { productId, branchId, quantity, reason, stockLotId? }
GET    /api/admin/stock/movements?search=&productId=&branchId=&type=&from=&to=&page=&size=
```

Notes: supplier merchandise entry should use purchase receipts. Confirmed receipt items create lots and PURCHASE_ENTRY movements transactionally.

Stock deductions follow FEFO policy: lots are consumed in expiration-date order, null expiration last. If total available stock is insufficient, the endpoint returns `INSUFFICIENT_STOCK`.

### Deduction response

```json
{
  "entries": [
    { "stockLotId": 1, "quantityToDeduct": 3, "lotAvailableBefore": 10, "lotAvailableAfter": 7 }
  ],
  "totalRequested": 3,
  "totalAvailable": 10,
  "fullySatisfied": true
}
```

The operation is transactional and uses `PESSIMISTIC_WRITE` locks on the selected lots.

### Orders

```
GET    /api/admin/orders?status=&branchId=&type=&from=&to=&page=&size=
GET    /api/admin/orders/{id}
PATCH  /api/admin/orders/{id}/prepare
PATCH  /api/admin/orders/{id}/ready
PATCH  /api/admin/orders/{id}/delivered
PATCH  /api/admin/orders/{id}/cancel  Request: { reason }
  Errors:   ORDER_NOT_FOUND (404), ORDER_INVALID_STATE (409),
            CANCEL_REASON_REQUIRED (400), ORDER_REFUNDED_CONFLICT (409),
            STOCK_LOT_NOT_FOUND (404) — only when reversal cannot find a lot
  Notes:    Cancels the order from any non-terminal state (DELIVERED/CANCELLED excluded).
            Reverses any deducted stock back to the same lots, recording CANCELLATION_RETURN
            movements linked to the original order id. Marks PENDING/APPROVED payments as
            CANCELLED. REFUNDED payments block the cancellation.
```

### POS (in-store sales)

```
GET /api/pos/products/search?q=<query>&branchId=<id>
  Auth:     roles ADMIN, MANAGER, EMPLOYEE
  Params:   q        required, 1-100 characters after trim
            branchId optional, used to resolve available stock
  Response: [PosProductSearchItemDto] (200)
  Errors:   POS_QUERY_REQUIRED (400), POS_QUERY_TOO_LONG (400)
  Heuristic:
            - if q matches \\d{6,}, runs an exact case-insensitive match on the
              barcode column (uses the unique idx_products_barcode index)
            - otherwise runs a name + brand + barcode + category LIKE search
              bounded to 25 results, sorted by name
  Notes:    Each row exposes the branch-level available stock. When branchId is
            omitted (e.g. no cash session is open yet), availableStock is null
            and the UI renders the row as "stock: —".

POST /api/pos/sales?branchId=<id>
  Auth:     roles ADMIN, MANAGER, EMPLOYEE
  Params:   branchId required for ADMIN; selects the branch and OPEN cash session.
            Ignored for MANAGER/EMPLOYEE, whose assigned branch is enforced server-side.
  Request:  {
              items:         [ { productId: number, quantity: integer >= 1 } ] (1-100 lines),
              paymentMethod: CASH | QR | TRANSFER | DEBIT_CARD | CREDIT_CARD | OTHER,
              cashReceived:  number | null  (optional, only meaningful for CASH),
              notes:         string | null  (optional, <= 500 chars)
            }
  Response: OrderDetailDto (201)
  Errors:   CASH_BRANCH_REQUIRED (400)    - cashier has no assigned branch, or ADMIN omitted branchId
            CASH_SESSION_NOT_FOUND (404)  - no OPEN cash session for the resolved branch
            BRANCH_NOT_FOUND (404)         - resolved branch is missing or inactive
            PRODUCT_NOT_FOUND (404)        - product id is missing or inactive
            INSUFFICIENT_STOCK (409)       - FEFO cannot cover the requested quantity
            VALIDATION_ERROR (400)         - malformed body (empty items, quantity <= 0, missing method)
  Notes:    Single transaction. Validates the open cash session, plans a FEFO
            stock deduction (expiration ASC, NULLS LAST) with pessimistic
            write locks, creates the order (POS, PAID) with order items
            (name + barcode snapshots), records one POS_SALE stock movement
            per lot touched (signed negative, unit cost snapshot) and a
            MANUAL/APPROVED payment linked to the same cash session.
            cashReceived is persisted in the payment metadata for change
            calculation / arqueo. Duplicate productId lines are merged.
```

### Cash register

```
POST  /api/admin/cash-sessions/open       Request: { openingCashAmount, openingNotes? }
GET   /api/admin/cash-sessions/current
POST  /api/admin/cash-sessions/{id}/movements  Request: { type, method, amount, reason }
POST  /api/admin/cash-sessions/{id}/close  Request: { countedCashAmount, closingNotes?, cashDifferenceReason? }
       Response: CashSessionDto (CLOSED) including expectedCashAmount, countedCashAmount,
                 cashDifferenceAmount, cashDifferenceReason, closedByUser, closedAt,
                 entries timeline and totalsByMethod breakdown.
       Errors:  CASH_SESSION_NOT_FOUND (404), CASH_SESSION_ALREADY_CLOSED (409),
                CASH_DIFFERENCE_REASON_REQUIRED (400), VALIDATION_ERROR (400).
GET   /api/admin/cash-sessions
GET   /api/admin/cash-sessions/{id}
```

### Suppliers

```
GET    /api/admin/suppliers?q=&page=&size=
POST   /api/admin/suppliers
PUT    /api/admin/suppliers/{id}
GET    /api/admin/supplier-products?productId=&supplierId=
POST   /api/admin/supplier-products
PUT    /api/admin/supplier-products/{id}
GET    /api/admin/supplier-products/{id}/cost-history
```

### Purchasing

```
GET    /api/admin/purchase-orders?supplierId=&branchId=&status=&page=&size=
POST   /api/admin/purchase-orders
GET    /api/admin/purchase-orders/{id}
PATCH  /api/admin/purchase-orders/{id}/confirm
PATCH  /api/admin/purchase-orders/{id}/send
PATCH  /api/admin/purchase-orders/{id}/cancel  Request: { reason }
GET    /api/admin/purchase-orders/{id}/pdf

GET    /api/admin/purchase-receipts?purchaseOrderId=&supplierId=&branchId=&status=&page=&size=
POST   /api/admin/purchase-receipts
GET    /api/admin/purchase-receipts/{id}
PATCH  /api/admin/purchase-receipts/{id}/confirm
PATCH  /api/admin/purchase-receipts/{id}/cancel  Request: { reason }
```

Notes: purchase orders do not affect stock. Confirming a purchase receipt creates stock lots, PURCHASE_ENTRY movements, and can update supplier replacement cost history if the user approves.

### Pricing

```
GET    /api/admin/products/{id}/sale-price-history
GET    /api/admin/pricing-rules
POST   /api/admin/pricing-rules
PUT    /api/admin/pricing-rules/{id}

GET    /api/admin/price-update-batches?supplierId=&status=&page=&size=
POST   /api/admin/price-update-batches/manual
POST   /api/admin/price-update-batches/import
GET    /api/admin/price-update-batches/{id}
PATCH  /api/admin/price-update-batches/{id}/defaults
PATCH  /api/admin/price-update-batches/{id}/items/{itemId}
PATCH  /api/admin/price-update-batches/{id}/apply-defaults-to-all
PATCH  /api/admin/price-update-batches/{id}/validate
PATCH  /api/admin/price-update-batches/{id}/apply
PATCH  /api/admin/price-update-batches/{id}/cancel
```

Notes: price update batches require human review before applying. They can update existing products or create new products from supplier rows. The preview supports global defaults, an apply-defaults-to-all action, and per-product overrides. They do not modify stock lots or existing lot unit costs.

### Reports

```
GET /api/admin/reports/dashboard
  Response: { todaySales, onlineSales, posSales, pendingOrders, lowStockProducts, expiringLots, topProducts }

GET /api/admin/reports/cash-overview?from=&to=&branchId=
  Response: { from, to, branchId, closedSessions, openSessions, balancedSessions,
              sessionsWithDifference, expectedCashTotal, countedCashTotal,
              netDifferenceTotal, absoluteDifferenceTotal, dailyCloseSeries,
              paymentMethods, sessionsWithDiscrepancy }
  Notes: Operational cash dashboard. All amounts are raw numeric values; the
         client formats currency and labels. ADMIN may scope by branch; other
         internal roles are restricted to their assigned branch.

GET /api/admin/reports/cash-session/{id}
  Response: { session, totalsByMethod: { CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD }, expectedCash, countedCash, difference, differenceReason }

GET /api/admin/reports/sales?from=&to=&branchId=
  Response: { from, to, branchId, branchName, kpis, series, byMethod,
              byCategory, topProducts }
  Notes: Uses Argentina business-day boundaries. Revenue breakdowns use net
         order totals and immutable category snapshots; gross margin uses
         stock-movement cost snapshots. Cancelled and stock-conflict orders are
         excluded from revenue.

GET /api/admin/reports/employees?from=&to=&branchId=
  Response: { from, to, branchId, branchName, kpis, employees }
  Notes: Includes attributable POS sales, POS revenue and average ticket,
         plus cash sessions opened/closed and absolute cash discrepancies.
         Online sales are excluded because they have no selling employee.

GET /api/admin/reports/inventory?branchId=
  Response: { branchId, branchName, kpis, stockByCategory, expiringByMonth,
              topByValue, lowStock }
  Notes: Consolidated low-stock results are evaluated independently per branch.
         KPIs include current valuation, capital expiring within 30 days, and
         active stock that is already expired.

GET /api/admin/reports/suppliers?from=&to=&branchId=
  Response: { from, to, branchId, branchName, kpis, purchasesByMonth,
              topByVolume, leadTimeBySupplier }
  Notes: Purchase amounts come from confirmed receipt quantities and actual
         receipt unit costs, not draft purchase orders. Lead time ends at the
         final confirmed receipt; on-time performance uses expected delivery.

GET /api/admin/recommendations
  Response: [ { type: "LOW_STOCK"|"EXPIRING_SOON"|"HIGH_ROTATION"|"NO_MOVEMENT", productId, productName, message, urgency } ]
```

### Users (internal)

```
GET    /api/admin/users?role=&branchId=&search=&page=&size=
POST   /api/admin/users
PUT    /api/admin/users/{id}
PATCH  /api/admin/users/{id}
PATCH  /api/admin/users/{id}/status  Request: { enabled }
```

### Branches

```
GET    /api/admin/branches
```

## Webhooks (public, signature-verified)

```
POST /api/webhooks/mercadopago
  Headers:  X-Signature: <signature>
  Response: 200 OK
  Notes:    Idempotent. Verifies signature, queries MP API, processes payment status change.
```
