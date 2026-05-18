# PROJECT KB

Generated: 2026-05-15

## OVERVIEW

Dietetica Lembas: POS+e-commerce modular monolith (NOT microservices). Java 21 + SB 3.5.0 | Angular 21.2 (CLI/Build 21.2.11) + PrimeNG 21.1.7 + Tailwind v4.3 + Vitest 4.0.8 + jsdom 28.0 | PostgreSQL 16. PM: npm 11.14.1.
Sprint 0: backend/ frontend/ on disk untracked, only docs/ committed on main.

## STRUCTURE

- backend/ (SB 3.5.0, Maven): 12 feature modules {auth,users,catalog,inventory,orders,payments,cash,suppliers,reports,audit,webhooks} each with 5 sub-pkgs {model,repository,service,web,dto}/ -- all package-info stubs. Only 3 real classes: LembasBackendApplication, SecurityConfig, OpenApiConfig.
- frontend/ (Angular 21.2 standalone): PrimeNG+Aura+Tailwind. app/ with core/ (guards,interceptors,services stubs), features/ (public-store,auth,customer,admin stubs), shared/ (empty models). @angular/build:application + :unit-test (Vitest).
- docs/: 50 files (domain, architecture, API, dev, deploy, academic).

## CMDS

- Backend install/test/run: cd backend && ./mvnw {dependency:resolve,test,spring-boot:run -Dspring-boot.run.profiles=dev}
- Frontend install: cd frontend && npm install
- Frontend run/test/build/format: cd frontend && npm {start,run test,run build} / npx prettier --write "src/**/*.{ts,html,css}"
- Git scaffold: git add backend/ frontend/ && git commit -m "feat: scaffold..."
- No docker-compose.yml yet. Flyway migrations dir = .gitkeep. Backend smoke excludes DB autoconfig intentionally (passes offline).

## GIT

Feature branches from main, squash-merge PRs. Conventional commits: feat fix docs refactor test chore. No direct main commits (except docs).

## BE (JAVA)

- Pkg by feature: com.dietetica.lembas.<module>/{model,repository,service,web,dto}
- Thin controllers, DTOs for API (no JPA entities exposed). Constructor injection only.
- Business rules live in services; extract helper classes only when a real complexity appears.
- Mercado Pago integration lives in the payments/webhooks services; add an abstraction only if a second provider is required.
- DomainException base (code+status). Single @ControllerAdvice -> uniform ApiError.
- Stock: @Lock(PESSIMISTIC_WRITE), open-in-view:false, ddl-auto:validate + Flyway.
- Security: CSRF disabled, stateless. Public: /api/auth/**, /api/store/**, /api/webhooks/**, /uploads/**, /actuator/health, /api-docs/**, /swagger-ui/**.

## FE (ANGULAR)

- Standalone components, signals (no NgRx), PrimeNG+Tailwind v4 (no Material).
- All-states pattern (loading/error/empty/data). Services hold state.
- Functional guards CanActivateFn: admin=[authGuard,adminGuard], customer=[authGuard,customerGuard].
- Lazy routes (loadChildren/loadComponent): /store, /auth (login/register), /customer (profile|orders|checkout), /admin (dashboard|products|inventory|orders|pos|cash|suppliers|reports|users).
- Aura theme via providePrimeNG(). tsconfig: strict+module preserve.
- Specs: TestBed.configureTestingModule({imports:[Component]}), describe/it/expect.

## DB

snake_case plural (stock_lots, order_items). id BIGSERIAL. entity_id FK. TIMESTAMPTZ audit. CHECK constraints (not lookup tables). Flyway versioned migrations only (no JPA auto-DDL).

## TESTS

BE: JUnit5+AssertJ (unit, @WebMvcTest, Testcontainers). FE: Vitest 4.0.8+jsdom 28.0. Critical: FEFO, MP webhook idempotency, POS+sale+stock, cash close discrepancy, cancellation+stock reversal.

## DOMAIN

1. Unified order: order.type=POS|ONLINE (same table, same FEFO). payment.cash_session_id null for online, required for in-store.
2. FEFO: expiration_date ASC NULLS LAST (lots w/o dates consumed last).
3. Stock deducted at payment confirmation (not at creation/delivery).
4. Cash register = physical cash only (QR/transfer/cards = informational at close).
5. DELIVERED = handed at branch pickup. Cancellation reverses same lots via stock_movements traced by order_id.
6. POS status=PAID only (DB CHECK). supplier_products UNIQUE(product_id, supplier_id).
7. Pickup only. No stock_reservations or branch_product_stock tables.

## HARD NO

Microservices, msg queues, Redis, separate POS/ONLINE models, home delivery, fiscal invoicing, guest checkout, AI/LLM, mobile app, notifications, Angular Material, exposing JPA entities from controllers, field injection, skipping critical tests, commits to main.

## GOTCHAS

- docs/04-processes/fefo-stock-deduction-flow.md (renamed from stock-reservation) -- no reservation exists.
- Scaffold NOT committed: first Sprint 1 = git add backend/ frontend/ && git commit.
- Angular docs ref v18 but @angular/core ^21.2.0 -- use v21 patterns (resource API, @angular/build).
- Tailwind v4: @import "tailwindcss", no tailwind.config.js. PrimeNG: Aura from @primeuix/themes (not legacy).
- DESING.md = design spec (37KB). Pi skills: angular-developer, frontend-designer, java-expert, docs-agent, review.

## ADRS

013=Stock timing (stock), 022=Unified orders (orders), 040=Pickup only (checkout), 009=Pkg-by-feature (new modules), 012=Controller-DTO (endpoints), 017=Security (auth), 025=Payment integration (payments), 031=Audit logging (audit), 037=Testing pyramid (tests).

## WHERE

- Overview/scope: docs/00-overview/{project-brief,scope}.md
- Domain model/entities/rules: docs/02-domain/{domain-model,entities,business-rules}.md
- Stock/Order/Payment/Cash rules: docs/02-domain/{stock-rules,order-rules,payment-rules,cash-register-rules}.md
- State machines: docs/02-domain/state-machines.md
- Architecture/security/DB: docs/03-architecture/
- 47 ADRs: docs/03-architecture/architecture-decisions.md
- API endpoints/errors/DTOs: docs/05-api/{endpoints,error-handling,dto-conventions}.md
- BE/FE conventions: docs/06-development/{backend-conventions,frontend-conventions}.md
- Coding standards/testing/setup: docs/06-development/{coding-standards,testing-strategy,setup}.md
- MVP/roadmap/epics: docs/01-product/{mvp,roadmap,epics}.md
- Integrations (MP): docs/03-architecture/integrations.md
- Deployment/env: docs/07-deployment/
- App config: backend/src/main/resources/application.yml
- SecurityConfig: backend/.../shared/config/SecurityConfig.java
- FE config/routes: frontend/src/app/{app.config,app.routes}.ts
- Design: frontend/DESING.md
