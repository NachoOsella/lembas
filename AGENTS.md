# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-15

## OVERVIEW

Project: **Dietetica Lembas** -- Integrated Commercial Management System with E-commerce
Stack: Java 21 + Spring Boot 3.5 / Angular 18 + PrimeNG + Tailwind CSS / PostgreSQL 16

This is a **monolithic** system (modular monolith, NOT microservices) with a shared commercial core serving both in-store POS and online e-commerce. The codebase does not exist yet -- this repo contains the full architecture and domain documentation ahead of implementation.

Current phase: **Pre-implementation** (documentation complete, code pending).

## STRUCTURE

```
lembas/
├── docs/                    # Full English documentation (54 files)
│   ├── 00-overview/         project-brief, scope, glossary
│   ├── 01-product/          mvp, roadmap, epics, user-stories, out-of-scope
│   ├── 02-domain/           domain-model, entities, business-rules, stock-rules,
│   │                        order-rules, payment-rules, cash-register-rules, state-machines
│   ├── 03-architecture/     overview, backend, frontend, database (with ER diagram),
│   │                        security, integrations, architecture-decisions (47 ADRs)
│   ├── 04-processes/        full Mermaid sequence diagrams for all critical flows
│   ├── 05-api/              api-guidelines, endpoints, error-handling, dto-conventions
│   ├── 06-development/      setup, coding-standards, backend-conventions,
│   │                        frontend-conventions, git-workflow, testing-strategy
│   ├── 07-deployment/       docker, local-environment, production-deployment, env-vars
│   └── 08-academic/         thesis-defense, technical-justification, project-risks
├── README.md
└── .gitignore
```

**Planned future structure** (when code is added):

```
lembas/
├── backend/                 # Spring Boot (Java 21)
│   └── src/main/java/com/dietetica/
│       ├── auth/
│       ├── users/
│       ├── catalog/
│       ├── inventory/
│       ├── orders/
│       ├── payments/
│       ├── cash/
│       ├── suppliers/
│       ├── reports/
│       ├── audit/
│       ├── webhooks/
│       └── shared/
├── frontend/                # Angular 18 (standalone components)
│   └── src/app/features/
│       ├── public-store/
│       ├── customer/
│       ├── admin/
│       └── auth/
├── docker-compose.yml
└── docs/                    # (already exists)
```

## COMMANDS

No commands yet (code not implemented). Planned:

| Action | Command |
|--------|---------|
| Start DB | `docker compose up -d db` |
| Run backend | `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` |
| Run frontend | `cd frontend && npm install && npm start` |
| Backend tests | `cd backend && ./mvnw test` |
| Frontend tests | `cd frontend && npm run test` |
| Build all | `docker compose up -d --build` |

## CODING STANDARDS

### Backend (Java)

- **Package by feature**: `com.dietetica.<module>/` (model, repository, service, web, dto, policy, gateway)
- **Controllers are thin**: no business logic in controllers. Delegate to services.
- **DTOs for API**: never expose JPA entities directly from controllers.
- **Constructor injection**: no field injection (`@Autowired` on fields is forbidden).
- **Domain policies**: pure Java classes (no Spring dependencies) for testable business logic (FEFO, cash calculation).
- **Adapters for externals**: `PaymentGateway` interface with `MercadoPagoGateway` and `FakePaymentGateway`.
- **Exception hierarchy**: all domain exceptions extend `DomainException` with `code` and `status`.
- **Global error handler**: single `@ControllerAdvice` returning uniform `ApiError` JSON.
- **Transactional with FOR UPDATE**: stock operations use pessimistic locking.

### Frontend (Angular)

- **Standalone components**: no NgModules.
- **Signals for state**: no NgRx. Use `signal()`, `computed()`, `effect()`.
- **PrimeNG + Tailwind**: PrimeNG for data-heavy components (tables, dialogs, forms), Tailwind for layout and spacing.
- **Do not mix UI libraries**: no Angular Material if PrimeNG is already in use.
- **All-states pattern**: every data-loading component handles `loading`, `error`, `empty`, and `data` states.
- **Services hold state**: not components.
- **Guards**: `AuthGuard`, `AdminGuard`, `CustomerGuard` for route protection.

### Database (PostgreSQL)

- **snake_case, plural**: `stock_lots`, `order_items`, `cash_sessions`.
- **Primary keys**: `id BIGSERIAL`.
- **Foreign keys**: `entity_id` (`product_id`, `branch_id`).
- **Audit fields**: `created_at`, `updated_at`.
- **CHECK constraints**: for enum-like columns instead of lookup tables.
- **Flyway migrations**: versioned SQL files, no manual DDL.

### Testing

- **Unit tests**: for domain policies (no Spring context).
- **Integration tests**: with Testcontainers (PostgreSQL).
- **Controller tests**: `@WebMvcTest`.
- **Critical flows to test**: FEFO deduction, MP webhook idempotency, POS sale with stock, cash close with discrepancy, order cancellation with reversal.

## WHERE TO LOOK

| Need | File |
|---|---|
| Project overview | `docs/00-overview/project-brief.md` |
| Domain entities and model | `docs/02-domain/domain-model.md`, `docs/02-domain/entities.md` |
| Business rules (all) | `docs/02-domain/business-rules.md` |
| Stock rules (FEFO) | `docs/02-domain/stock-rules.md` |
| Order rules | `docs/02-domain/order-rules.md` |
| Payment rules | `docs/02-domain/payment-rules.md` |
| Cash register rules | `docs/02-domain/cash-register-rules.md` |
| State machines | `docs/02-domain/state-machines.md` |
| Architecture overview | `docs/03-architecture/architecture-overview.md` |
| Backend structure | `docs/03-architecture/backend-architecture.md` |
| Frontend structure | `docs/03-architecture/frontend-architecture.md` |
| Database schema (SQL + ERD) | `docs/03-architecture/database-design.md` |
| Security and roles | `docs/03-architecture/security-architecture.md` |
| All 47 ADRs | `docs/03-architecture/architecture-decisions.md` |
| API endpoints | `docs/05-api/endpoints.md` |
| Error format | `docs/05-api/error-handling.md` |
| DTO conventions | `docs/05-api/dto-conventions.md` |
| Backend conventions | `docs/06-development/backend-conventions.md` |
| Frontend conventions | `docs/06-development/frontend-conventions.md` |
| Coding standards | `docs/06-development/coding-standards.md` |
| Testing strategy | `docs/06-development/testing-strategy.md` |
| Development setup | `docs/06-development/setup.md` |
| Scope (in/out) | `docs/00-overview/scope.md` |
| Out-of-scope details | `docs/01-product/out-of-scope.md` |
| MVP definition | `docs/01-product/mvp.md` |
| Roadmap (4 sprints) | `docs/01-product/roadmap.md` |
| Epics and user stories | `docs/01-product/epics.md`, `docs/01-product/user-stories.md` |
| Integrations (Mercado Pago) | `docs/03-architecture/integrations.md` |
| Deployment | `docs/07-deployment/` |
| Academic defense | `docs/08-academic/` |

## CRITICAL RULES (HARD CONSTRAINTS)

These must NOT be violated during implementation:

### Architecture

- **No microservices.** This is a modular monolith. Period.
- **No message queues** (Kafka, RabbitMQ). Not needed.
- **No Redis or external caches.** Not needed for MVP.
- **No separate order/payment models for POS and ONLINE.** They are unified.
- **No `stock_reservations` table.** Stock is deducted on payment confirmation, reversed via cancellation movements.
- **No `branch_product_stock` table.** Stock is calculated from `stock_lots`.

### Scope

- **No home delivery.** Pickup only (`fulfillment_type = 'PICKUP'`).
- **No fiscal invoicing** (AFIP/ARCA).
- **No guest checkout.** Customers must register (CUSTOMER role).
- **No AI/LLM.** Recommendations are rule-based only.
- **No mobile app.** Responsive web is sufficient.
- **No email/SMS/WhatsApp notifications.**

### Implementation

- **Controllers must not contain business logic.**
- **Do not expose JPA entities from controllers.** Use DTOs.
- **Do not use field injection.** Use constructor injection.
- **Do not skip tests for critical flows** (stock, payments, cash register).
- **Do not commit directly to main.** Use feature branches.
- **Do not mix PrimeNG and Angular Material.** Pick one (PrimeNG).

## KEY DOMAIN FACTS TO REMEMBER

1. **Unified order model**: `order.type` = POS or ONLINE. Same table. Same FEFO logic for stock deduction.
2. **Unified payment model**: `payment.cash_session_id` null for online, required for in-store.
3. **FEFO always**: stock ordered by `expiration_date ASC NULLS LAST`. Lots without dates consumed last.
4. **Stock deducted at payment confirmation**: not at order creation, not at delivery.
5. **Cash register controls physical cash only**: other methods (QR, transfer, cards) are informational at close.
6. **DELIVERED = handed to customer at branch for pickup**: NOT home delivery.
7. **Cancellation reverses to the same lots**: looks up original stock_movements by `order_id`.
8. **POS status is PAID**: not COMPLETED. The DB CHECK constraint only has PAID.
9. **`supplier_products` has UNIQUE(product_id, supplier_id)**: prevents duplicate associations.
10. **`stock_movements.order_id` has FK to orders**: for traceability.
11. **`orders.fulfillment_type` has CHECK constraint**: currently restricted to `PICKUP`.

## COMMON GOTCHAS

- The Spanish Obsidian vault (`~/Documents/TFI/Documentation/Dietetica Lembas/`) has the detailed process docs and user stories with full acceptance criteria. The English `docs/` in this repo is a curated subset.
- `docs/04-processes/fefo-stock-deduction-flow.md` was renamed from `stock-reservation-flow.md` to avoid confusion -- there is **no stock reservation** in this system.
- The 47 ADRs in `docs/03-architecture/architecture-decisions.md` are the authoritative source for why decisions were made. Always check ADR-013 (stock timing), ADR-022 (unified orders), ADR-040 (pickup only) before implementing.
