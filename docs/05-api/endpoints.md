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
POST   /api/admin/stock/lots
POST   /api/admin/stock/adjustments  Request: { productId, branchId, quantity, reason, stockLotId? }
GET    /api/admin/stock/movements?productId=&branchId=&type=&from=&to=&page=&size=
```

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
```

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
