# PROJECT KB

Generated: 2026-07-21

## OVERVIEW

Dietetica Lembas: locally verified POS + pickup e-commerce modular monolith, not microservices. Java 21 / Spring Boot 3.5.0 / Maven | Angular 21.2 standalone / PrimeNG 21.1.7 Aura / Tailwind 4.3 / Vitest 4 / jsdom 28 | PostgreSQL 16 | Node 22.14 / npm 11.14.1.

## STRUCTURE

- `backend/`: feature packages `audit,auth,cash,catalog,content,inventory,orders,payments,pos,reports,suppliers,users`; shared infrastructure under `shared/`.
- Backend feature shape: `model,repository,service,web,dto`; module contracts live in `api/`; inventory also separates orchestration in `application/`; payment provider code lives in `gateway/`.
- `frontend/`: `core/`, `shared/`, and feature slices. Domain features expose `public-api.ts`; `scripts/check-feature-boundaries.mjs` rejects deep cross-feature imports.
- `docker/`: PostgreSQL, backend, Nginx frontend, and optional ngrok sandbox tunnel. Images run non-root; Nginx rejects TRACE.
- `docs/`: product, domain, architecture, processes, API, development, deployment, and academic evidence.

## COMMANDS

```bash
# Backend
cd backend && ./mvnw test
cd backend && ./mvnw clean verify
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Frontend
cd frontend && npm ci
cd frontend && npm start
cd frontend && npm run boundaries
cd frontend && npm run verify
cd frontend && npm run test:coverage

# Containers
cp docker/.env.example docker/.env
docker compose --env-file docker/.env -f docker/compose.yml up --build
docker compose --env-file docker/.env.example -f docker/compose.yml config --quiet
docker build -f docker/backend.Dockerfile -t lembas-backend:verify .
docker build -f docker/frontend.Dockerfile -t lembas-frontend:verify .
```

Do not run Maven, Angular, and Docker heavy gates concurrently; execute them sequentially to avoid RAM pressure. Current clean baseline: backend 920 tests; frontend 986 tests. Coverage floors: statements 75%, branches 74%, functions 55%, lines 78%.

## GIT

- Never commit, push, reset, stash, or switch branches unless explicitly requested.
- Never implement directly on `main`; use a user-story branch.
- Preserve unrelated working-tree changes. Conventional commit types: `feat|fix|docs|refactor|test|chore`.

## BACKEND RULES

- Package by feature. Thin controllers; DTOs at HTTP boundaries; never expose JPA entities.
- Constructor injection only. Business rules belong in services/application services.
- Cross-module calls must use the owning module's `api/` contract; never access another module's repository. ArchUnit enforces this.
- Public contracts currently cover catalog lookup/search/pricing, inventory queries/commands/receipts, order query/command/locking, payment queries, branches, and users.
- Architecture allowlists for cross-module repositories, controller repositories, and field injection are empty. The sole shared-feature exception is `SecurityConfig -> JwtAuthenticationFilter` infrastructure wiring.
- Throw `DomainException(code,status,message)` from services. `GlobalExceptionHandler` returns `ApiError {status,code,message,details,timestamp,path}`. Document new codes in `docs/05-api/api-guidelines.md` and `error-handling.md`.
- Mercado Pago stays in `payments`; do not add a provider abstraction until a second provider exists. Webhook signature failures also use `ApiError`.
- Persistence: `open-in-view:false`, `ddl-auto:validate`, Flyway only. Use pessimistic locks for contested aggregates and a consistent lock order. Concurrency tests use latches/barriers and `TransactionTemplate`, never sleeps.

## FRONTEND RULES

- Standalone components and signals; no NgRx. Strict TypeScript with preserved modules.
- Import another feature only through its `public-api.ts`; run `npm run boundaries` after changing feature imports.
- Prefer PrimeNG controls. Use Tailwind/custom CSS for layout and brand refinement; no Angular Material.
- Use loading/error/empty/data states. State belongs in feature stores/services.
- Map `ApiError.code` to controlled user copy; never display raw backend messages except an intentional fallback. Global network/5xx/auth behavior belongs in interceptors.
- Use lazy routes and functional guards. Admin routes require auth + staff role guards; customer routes require auth + customer guard.
- Specs import standalone components through TestBed and use Vitest `describe/it/expect`.

## SECURITY

- Stateless JWT auth in HttpOnly, same-site cookies; secure cookies are forced by production policy. CSRF is disabled; origin validation protects cookie-authenticated unsafe requests.
- Public: auth register/login/refresh/logout, `/api/store/**`, `/api/webhooks/**`, `/uploads/**`, health, OpenAPI, Swagger. `/api/customer/**` is CUSTOMER-only; `/api/pos/**` and `/api/admin/**` are staff-only. TRACE is denied.
- Never use real secrets in source or examples. Real CI, DNS, TLS, secrets, and public Mercado Pago callback validation remain deployment tasks.

## DATABASE

- PostgreSQL names: plural `snake_case`; IDs `BIGSERIAL`; foreign keys `<entity>_id`; audit timestamps `TIMESTAMPTZ`; enums enforced with CHECK constraints where practical.
- Never edit an applied migration or use JPA auto-DDL. Add the next versioned migration and preserve all existing migration files.

## DOMAIN INVARIANTS

1. One order model: `type=POS|ONLINE`; both consume inventory through the same FEFO policy.
2. FEFO order: `expiration_date ASC NULLS LAST`; undated lots are consumed last.
3. Stock is deducted on payment confirmation, never on order creation or pickup.
4. Online deduction preflights grouped demand, locks lots deterministically, and never partially mutates stock. Insufficient stock becomes `STOCK_CONFLICT` without passing through `PAID`.
5. Webhook delivery is idempotent. Lock order is order then payment. Cancellation/refund restores the exact consumed lots once.
6. POS orders are `PAID`; `payment.cash_session_id` is required in-store and null online.
7. Cash sessions reconcile physical cash only; QR, transfer, and card amounts are informational. Closing is serialized against sales/manual movements and duplicate closes.
8. Purchase receipt locks its order and cannot over-receive concurrently.
9. `DELIVERED` means handed over at branch pickup. Pickup only: no delivery, guest checkout, stock reservations, or `branch_product_stock`.
10. `supplier_products` is unique by `(product_id,supplier_id)`.

## CRITICAL TESTS

Never weaken or skip coverage for FEFO, webhook signature/idempotency/concurrency, POS sale + stock + cash, online lifecycle and stock conflict, exact-lot cancellation/refund reversal, cash-close discrepancy/concurrency, and purchase over-receipt concurrency. Full lifecycle coverage lives in `backend/src/test/java/com/dietetica/lembas/integration/` plus focused feature integration tests.

## HARD NO

Microservices, message queues, Redis, separate POS/ONLINE models, reservations, home delivery, fiscal invoicing, guest checkout, AI features, mobile apps, notifications, Angular Material, cross-module repositories, controller-to-repository access, field injection, exposed JPA entities, edited historical migrations, skipped critical tests, or direct work on `main`.

## WHERE

- Scope/domain: `docs/00-overview/`, `docs/02-domain/`
- Architecture/security/DB/ADRs: `docs/03-architecture/`
- Business flows: `docs/04-processes/`
- API/errors/DTOs: `docs/05-api/`
- Coding/testing/setup/git: `docs/06-development/`
- Docker/env/production: `docs/07-deployment/`
- Deferred work and thesis prompt: `docs/refactoring-execution-plan.md`
- Backend config/security: `backend/src/main/resources/application.yml`, `backend/.../shared/config/SecurityConfig.java`
- Frontend config/routes/design: `frontend/src/app/{app.config,app.routes}.ts`, `frontend/DESING.md`

## AI USAGE LOG

Update `docs/ai-usage-log.md` only for meaningful generated modules/docs, business logic, architecture, or configuration changes. Do not log formatting, typo fixes, trivial renames, or minor implementation details. Keep entries concise and historical.
