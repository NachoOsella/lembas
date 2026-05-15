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
  catalog/          -- Products, categories
  inventory/        -- StockLot, StockMovement, FEFO
  orders/           -- Unified orders (POS and ONLINE)
  payments/         -- Payment, MercadoPagoGateway, webhook
  cash/             -- CashSession, CashMovement
  suppliers/        -- Suppliers, supplier_products
  reports/          -- Dashboard, cash report, recommendations
  audit/            -- AuditLog
  webhooks/         -- Webhook endpoints (Mercado Pago)
  shared/           -- Common DTOs, exceptions, utilities
```

Each module follows:

```
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
  gateway/
    PaymentGateway.java            -- Interface
    MercadoPagoGateway.java        -- Real MP API implementation
    FakePaymentGateway.java        -- For tests and development
  service/
    PaymentService.java            -- Creation, update, query
    MercadoPagoService.java        -- Create preference, verify payment, process webhook
  web/
    PaymentController.java         -- Few endpoints (payments created from orders)
    MercadoPagoWebhook.java        -- POST /api/webhooks/mercadopago
```

## Example: cash module

```text
cash/
  model/
    CashSession.java
    CashMovement.java
    CashMovementType.java
  policy/
    CashCloseCalculator.java       -- Expected cash calculation, difference detection
  service/
    CashService.java               -- Open, close, movements, report
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
  policy/
    FefoStockDeductionPolicy.java   -- Pure FEFO logic, testable without Spring
  service/
    InventoryService.java           -- Orchestrates Policy + Repository + @Transactional
  web/
    InventoryController.java
```

## Implementation rules

- Controllers must not contain business logic
- Business logic belongs in services or domain policy classes
- Use DTOs for API input/output -- never expose JPA entities directly
- Complex domain logic (FEFO, cash calculation) extracted into testable policy classes
- External integrations (Mercado Pago) behind interface adapters

## Security filter chain

```text
SecurityFilterChain
  ├── CorsFilter
  ├── CsrfFilter (DISABLED) -- REST API is stateless
  ├── JwtAuthenticationFilter
  └── ExceptionHandlerFilter

Public routes: /api/auth/**, /api/store/**, /api/webhooks/**, /uploads/**
Customer routes: /api/customer/** (CUSTOMER role)
Admin routes: /api/admin/** (ADMIN, MANAGER, EMPLOYEE)
```

## Transactional operations

| Operation | Tables involved | Strategy |
|---|---|---|
| POS sale | orders, order_items, stock_lots, stock_movements, payments, cash_sessions | FOR UPDATE |
| MP webhook (approve) | payments, orders, stock_lots, stock_movements | FOR UPDATE |
| Cancel order | orders, stock_lots, stock_movements, payments | FOR UPDATE |
| Stock entry | stock_lots, stock_movements | READ COMMITTED |

## Error handling

All domain exceptions inherit from `DomainException` and are handled by a global `@ControllerAdvice`. Response format is standardized `ApiError`.

| Module | Exceptions |
|---|---|
| catalog | ProductNotFoundException, ProductNotPublishedException |
| inventory | InsufficientStockException, LotExpiredException |
| orders | OrderNotFoundException, OrderInvalidStateException |
| payments | PaymentFailedException, MercadoPagoException |
| cash | CashSessionNotOpenException, CashSessionAlreadyOpenException, CashDifferenceException |
| auth | InvalidCredentialsException, AccountDisabledException |
