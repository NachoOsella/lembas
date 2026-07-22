# Backend Architecture

## Stack

| Component | Version / Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.5.x |
| Web | Spring Web MVC |
| Data | Spring Data JPA / Hibernate |
| Security | Spring Security (JWT) |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| Container testing | Testcontainers |
| API docs | Springdoc OpenAPI |

## Project structure

```text
backend/
  auth/             -- Authentication JWT, registration, login
  users/            -- Internal user management (ADMIN/MANAGER/EMPLOYEE)
  catalog/          -- Products, categories, pricing rules
  content/          -- Legal content (Terms and Conditions, FAQ)
  inventory/        -- StockLot, StockMovement, FEFO deduction, manual adjustments
  orders/           -- Unified orders (POS and ONLINE)
  payments/         -- Payment, Mercado Pago integration and webhook endpoint
  cash/             -- CashSession, CashMovement
  pos/              -- Point of Sale product search and sale creation
  suppliers/        -- Suppliers, supplier_products, purchasing, price update batches
  reports/          -- Dashboard, cash report, recommendations
  audit/            -- AuditLog (stub -- table and full implementation deferred to post-MVP)
  shared/           -- Common DTOs, exceptions, utilities, branch management, security
```

Each module follows:

```text
module/
  model/       -- JPA entities, enums
  repository/  -- Spring Data repositories
  service/     -- Business logic services
  web/         -- REST controllers
  dto/         -- Request/Response DTOs
```

## Example: payments module

```text
payments/
  model/
    Payment.java
    PaymentProvider.java           -- Enum: MERCADO_PAGO, MANUAL, BANK, CARD_TERMINAL
    PaymentMethod.java             -- Enum: CHECKOUT_PRO, CASH, QR, TRANSFER, etc.
    PaymentStatus.java             -- Enum: PENDING, APPROVED, REJECTED, etc.
  service/
    PaymentService.java            -- Creation, update, query
    MercadoPagoService.java        -- Create preference, verify payment, process webhook
  web/
    PaymentController.java         -- Few endpoints (payments created from orders)
    MercadoPagoWebhookController.java -- POST /api/webhooks/mercadopago
```

## Example: cash module

```text
cash/
  model/
    CashSession.java
    CashMovement.java
    CashMovementType.java
  service/
    CashService.java               -- Open, close, movements, report, expected cash calculation
  web/
    CashController.java            -- Cash endpoints
```

## Example: inventory module (FEFO)

```text
inventory/
  model/
    StockLot.java
    StockMovement.java
    StockMovementType.java
  service/
    InventoryService.java          -- FEFO deduction, stock entries, movements, @Transactional
  web/
    InventoryController.java
```

## Example: content module (legal)

```text
content/
  dto/
    TermsDto.java                  -- Terms and Conditions title, sections
    FaqDto.java                    -- FAQ title, items grouped by category
  service/
    LegalContentService.java       -- Hardcoded legal content, no persistence
  web/
    LegalContentStoreController.java -- GET /api/store/terms, GET /api/store/faq
```

## Example: pos module (in-store sales)

```text
pos/
  dto/
    CreatePosSaleRequest.java      -- Items, payment method, cash received
    CreatePosSaleItemRequest.java   -- Product ID, quantity
    PosProductSearchItemDto.java    -- Search result with stock
  service/
    PosProductSearchService.java   -- Barcode / name search heuristic
    PosSaleService.java            -- Transactional sale with FEFO deduction
  web/
    PosProductController.java      -- GET /api/pos/products/search
    PosSaleController.java         -- POST /api/pos/sales
```

## Module API contracts (cross-module boundaries)

Modules expose owned API contracts in an `api/` sub-package. Other modules may
call these contracts directly; they must never access another module's
repository. ArchUnit enforces this at build time.

```text
catalog/api/
  ProductLookup.java               -- Product lookup by ID, barcode
  ProductSearch.java               -- Published product search with pagination
  SupplierPricingCatalog.java      -- Product resolution for supplier price batches

inventory/api/
  InventoryQuery.java              -- Product summaries, lots, movements
  StockCommand.java                -- FEFO deduction, adjustments, reversals
  PosStockCommand.java             -- POS-specific stock deduction
  PurchaseReceiptEntryCommand.java -- Stock entry from purchase receipts

orders/api/
  OrderCommand.java                -- Save orders
  OrderQuery.java                  -- Find orders with items
  OrderLock.java                   -- Pessimistic order lock

payments/api/
  CashPaymentQuery.java            -- Approved cash payments for a session
  CustomerPaymentQuery.java        -- Payments for a customer order

users/api/
  UserDirectory.java               -- Email/user lookup, customer registration

shared/branch/api/
  BranchQuery.java                 -- Branch lookup, active checks
```

## Implementation rules

- Controllers must not contain business logic
- Business logic belongs in services
- Use DTOs for API input/output -- never expose JPA entities directly
- Keep external API calls localized in the service that owns the feature
- Extract helper classes only when a service becomes too large or a second implementation is required

## Security filter chain

```text
SecurityFilterChain
  ├── CorsFilter
  ├── CsrfFilter (DISABLED) -- REST API is stateless
  ├── JwtAuthenticationFilter
  └── ExceptionHandlerFilter

Public routes: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, /api/store/**, /api/webhooks/**, /uploads/**, /actuator/health, /api-docs/**, /swagger-ui/**, /swagger-ui.html
Customer routes: /api/customer/** (CUSTOMER role)
POS routes: /api/pos/** (ADMIN, MANAGER, EMPLOYEE)
Admin routes: /api/admin/** (ADMIN, MANAGER, EMPLOYEE)
```

## Transactional operations

| Operation | Tables involved | Strategy |
|---|---|---|
| POS sale | orders, order_items, stock_lots, stock_movements, payments, cash_sessions | FOR UPDATE |
| MP webhook (approve) | payments, orders, stock_lots, stock_movements | FOR UPDATE |
| Cancel order | orders, stock_lots, stock_movements, payments | FOR UPDATE |
| Purchase receipt confirmation | purchase_receipts, purchase_receipt_items, stock_lots, stock_movements, supplier_products, supplier_product_cost_history | READ COMMITTED |
| Manual stock adjustment | stock_lots, stock_movements | READ COMMITTED |

## Error handling

Business-rule failures use `DomainException`, which carries a stable `code`, an HTTP `status`, and a backend `message`. A global `@ControllerAdvice` converts those exceptions into the standardized `ApiError` response format documented in `docs/05-api/error-handling.md`.

Clients must map user-facing messages from the error `code`, not from Java exception class names or raw backend messages.
