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
  Notes:    Only onlineStatus=PUBLISHED. Filters by branch stock availability.

GET /api/store/products/{id}?branchId=
  Response: ProductDetailDto
  Errors:   PRODUCT_NOT_FOUND (404)

GET /api/store/categories
  Response: [ { id, name, productCount } ]
```

## Customer (role CUSTOMER)

```
GET /api/customer/profile
  Response: { id, firstName, lastName, email, phone, createdAt }

PATCH /api/customer/profile
  Request:  { firstName?, lastName?, phone? }
  Response: { id, firstName, lastName, email, phone }

POST /api/customer/orders
  Request:  { items: [ { productId, quantity } ], paymentMethod: "MERCADO_PAGO" }
  Response: OrderCreatedDto { id, orderNumber, status: "PENDING_PAYMENT", total } (201)
  Errors:   INSUFFICIENT_STOCK (409), PRODUCT_NOT_FOUND (404)

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
POST   /api/admin/stock/adjustments  Request: { productId, branchId, quantity, reason, stockLotId? }
GET    /api/admin/stock/movements?productId=&branchId=&type=&from=&to=&page=&size=
```

Notes: supplier merchandise entry should use purchase receipts. Confirmed receipt items create lots and PURCHASE_ENTRY movements transactionally.

### Orders

```
GET    /api/admin/orders?status=&branchId=&type=&from=&to=&page=&size=
GET    /api/admin/orders/{id}
PATCH  /api/admin/orders/{id}/prepare
PATCH  /api/admin/orders/{id}/ready
PATCH  /api/admin/orders/{id}/delivered
PATCH  /api/admin/orders/{id}/cancel  Request: { reason }
```

### POS (in-store sales)

```
POST /api/admin/pos/sales
  Request:  { items: [ { productId, quantity } ], paymentMethod, customerUserId?, customerNameSnapshot? }
  Response: OrderDetailDto (201)
  Errors:   INSUFFICIENT_STOCK (409), CASH_SESSION_REQUIRED (400)
  Notes:    Transactional: validates open register, deducts FEFO stock, creates order, payment, movements.
```

### Cash register

```
POST  /api/admin/cash-sessions/open       Request: { openingCashAmount, openingNotes? }
GET   /api/admin/cash-sessions/current
POST  /api/admin/cash-sessions/{id}/movements  Request: { type, method, amount, reason }
POST  /api/admin/cash-sessions/{id}/close  Request: { countedCashAmount, closingNotes?, cashDifferenceReason? }
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

GET /api/admin/reports/cash-session/{id}
  Response: { session, totalsByMethod: { CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD }, expectedCash, countedCash, difference, differenceReason }

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
