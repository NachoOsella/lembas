# Modular Monolith Refactoring Execution Plan

## Purpose

This document is the resumable execution guide for the full Lembas refactoring. It records the baseline, findings, work already performed, current broken point, target architecture, safe implementation order, validation gates, and delegation prompts.

It is intentionally operational. A new agent must be able to continue after context compaction without repeating the full audit or making unsafe architectural changes.

## Repository State

- Repository: `https://github.com/NachoOsella/lembas`
- Source branch: `feat/frontend-visual-refactor`
- Working branch: `refactor/modular-architecture`
- Base commit: `3afdcab47` (`visual changes`)
- Commits created by this refactoring: none
- Pushes performed: none
- Working tree: intentionally contains a large uncommitted refactoring in progress
- Java: 21
- Spring Boot: 3.5.0
- Angular: upgraded in the working tree from 21.2.13 to 21.2.18
- TypeScript: 5.9
- PrimeNG: 21.1.7
- PostgreSQL: 16

Do not switch branches, reset the working tree, run destructive Git commands, commit, or push unless the user explicitly requests it.

## Absolute Migration Constraint

The following directory is immutable:

```text
backend/src/main/resources/db/migration
```

Never edit, move, rename, reorder, add, or delete files in that directory. Never modify existing seed data or Flyway configuration to reorganize migrations.

A checksum snapshot was captured before implementation at:

```text
/tmp/lembas-migrations-before.sha256
```

That temporary file may not survive a restarted environment. The durable comparison is always the Git comparison against the base commit:

```bash
git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration
git diff --name-status 3afdcab47 -- backend/src/main/resources/db/migration
```

Both commands must show no migration changes at every major checkpoint and at completion.

If a requested improvement requires a schema change, do not implement it. Record the limitation in the final report and choose a solution compatible with the existing schema.

## Mandatory Reading for Every Implementing Agent

Before editing, read:

1. `/home/nacho/Documents/Lembas/AGENTS.md`
2. `/home/nacho/.pi/agent/skills/java-expert/SKILL.md` for backend work
3. `/home/nacho/.pi/agent/skills/angular-developer/SKILL.md` for frontend work
4. The relevant domain and architecture documentation under `docs/`
5. This execution plan

Do not rely only on this plan for business rules. The source of truth remains the domain documentation and existing characterization tests.

## Non-Negotiable Domain Invariants

1. The application remains a modular monolith. Do not introduce microservices, messaging, CQRS, event sourcing, or command buses.
2. POS and online purchases use one unified `orders` model.
3. Stock is derived from `stock_lots`; there is no stock reservation table or denormalized branch stock table.
4. FEFO ordering is `expiration_date ASC NULLS LAST`, then deterministic lot identity ordering.
5. Stock is deducted at payment confirmation, not order creation or delivery.
6. POS sales and approved online payments use the same inventory rules.
7. Cancellation restores stock to the exact lots consumed by the original sale movements.
8. Cash close counts physical cash only; non-cash methods are informational.
9. Online fulfillment is branch pickup only.
10. No guest checkout.
11. Backend controllers return DTOs, never JPA entities.
12. Transactions belong in application services, not controllers, repositories, or mappers.

## Baseline Results Before Refactoring

### Frontend baseline

Commands:

```bash
cd frontend
npm test -- --watch=false
npm run build
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
```

Results:

- 122 spec files passed.
- 931 tests passed.
- Production build passed.
- Application and spec typechecks passed.
- Existing tests emitted jsdom warnings for `scrollTo`, canvas, navigation, and local storage.
- There was no real linter.
- The `lint` script ran mutating Prettier.
- `prettier --check` failed on 92 files.

### Backend baseline

Commands:

```bash
cd backend
./mvnw clean test -DskipTests
./mvnw test
```

Results:

- 836 tests passed.
- No test failures or errors.
- Testcontainers successfully ran PostgreSQL 16 integration tests.
- A first non-clean parallel invocation produced stale compilation symptoms; a clean compilation and the subsequent normal test run passed. Treat clean CI execution as authoritative.
- Existing warnings included a redundant Lombok exclusion annotation and deprecated API usage in `RecommendationService`.

## High-Level Audit Findings

### Frontend

- `core/services` contained most domain HTTP clients.
- `shared/models` contained nearly every business model.
- `shared/components` mixed generic UI primitives with catalog, storefront, dashboard, and reporting UI.
- Feature stores such as dashboard and POS cart were root singletons.
- 93 components lacked `ChangeDetectionStrategy.OnPush`.
- Production `any` existed in the dashboard chart and signal form wrapper.
- `getApiError()` used an unchecked cast.
- Several pages interpreted raw `HttpErrorResponse` payloads.
- Older concurrent requests could overwrite newer state in POS search and public catalog flows.
- F8 POS checkout refreshed the cash session asynchronously but immediately submitted using stale state.
- The production route table exposed `/dev/ui`.
- Major page hotspots remain in pricing, orders, order detail, home, cash close, inventory, purchase orders, suppliers, and users.

### Backend

- `InventoryService` is a 677-line hotspot combining queries, lot creation, FEFO deduction, adjustments, mappings, and reversal.
- POS duplicates inventory FEFO mutation logic.
- POS can leave zero-quantity lots as `ACTIVE`.
- Webhook idempotency is not concurrency-safe because payment/order reads are not locked.
- The webhook stock-conflict path may mark a shared transaction rollback-only before attempting to persist `STOCK_CONFLICT`.
- Refunded online payments can cancel orders without stock reversal.
- Concurrent cancellation can reverse the same movements twice.
- Cash close races POS sales and cash movements.
- Concurrent purchase receipt confirmations can over-receive an order.
- Multiple modules directly import repositories belonging to other modules.
- `CustomerPaymentController` directly uses `PaymentRepository`.
- `ReportQueryRepository` uses field injection.
- Recommendation urgency contains a duplicated `daysWithoutSales >= 60` branch, making one severity branch unreachable.
- Error code documentation is incomplete and inconsistent with implementation.

## Implementation Status at Handoff

Use the following status definitions:

- **Implemented:** source/configuration changes are present in the working tree.
- **Partially implemented:** a meaningful first step is present, but the phase acceptance criteria are not met.
- **Validated:** all phase-specific commands passed after the latest related edit.
- **Pending:** no implementation has been made yet.

### Implemented in the working tree

- New branch and migration integrity baseline.
- Frontend ESLint/Prettier/typecheck/test/build/coverage/verify scripts.
- Angular dependency security upgrade to 21.2.18.
- Frontend feature ownership directories and import aliases.
- Domain HTTP clients moved out of `core`.
- Business models moved out of `shared`.
- Catalog, storefront, dashboard, and report UI moved out of `shared`.
- `core` reduced to authentication, error policy, guards, interceptors, and global pipes.
- OnPush change detection applied broadly.
- Dashboard and POS state changed from root scope to page scope.
- POS search changed to cancellation-aware latest-request behavior.
- F8 checkout changed to wait for cash-session refresh.
- Runtime API error validation and malformed-payload tests added.
- Raw backend-message fallback usage removed from centralized mappings.
- Production `/dev/ui` route removed.
- Maven Enforcer, Spotless, JaCoCo, SpotBugs, and ArchUnit dependencies/configuration added.
- GitHub Actions verification workflow added.
- This detailed continuation plan and AI usage entry added.

### Implemented but not yet fully validated

The entire frontend move is currently **not green**. Plain TypeScript typechecking passed during the move, but the subsequent Angular test compilation exposed a runtime DI import problem in `AuthService`. Further edits were made after that failure, so lint, typecheck, tests, coverage, and production build must all be rerun from the current state.

The backend quality plugins are also **not fully validated**. Maven `validate` passed, but `mvn clean verify` has not been run with JaCoCo, SpotBugs, Spotless, and the future ArchUnit tests together.

The CI workflow exists but has not run on GitHub. Docker image verification has not yet been run for this change set.

### Partially implemented

- Frontend architecture boundaries: ownership moves exist, but public feature APIs and complete cross-feature import enforcement still need review.
- Frontend dashboard: store scope is fixed, but overlapping refresh cancellation and lifecycle tests remain.
- Frontend POS: scope, F8 sequencing, and search cancellation were changed, but regression tests must be repaired/expanded and passed.
- Frontend error handling: normalized extraction exists, but every feature must still be checked for direct `HttpErrorResponse` interpretation.
- Frontend quality gates: scripts/configuration exist, but integrated verification is pending.
- Backend quality gates: plugins exist, but architecture tests and full verification are pending.
- Security hardening: Angular vulnerabilities and the dev route were addressed; backend production secrets, Swagger, TRACE, cookies, CORS/origin policy, Nginx, and ngrok remain pending.

### Not implemented yet

- No backend production Java service or controller has been architecturally refactored yet.
- `InventoryService` has not been split.
- POS still needs migration to the inventory module API.
- Cross-module repository access has not been removed.
- ArchUnit test classes have not been created.
- Webhook, refund, cancellation, cash-close, and receipt concurrency defects have not been fixed.
- Backend error codes have not been fully normalized/documented.
- Major frontend page decomposition for inventory, orders, reports, cash, suppliers, pricing, products, users, checkout, and public store is not complete.
- Critical end-to-end/integration flow coverage has not been added.
- Architecture and development documentation has not yet been updated to describe the final code.
- No final verification report has been produced.
- No commit or push has been performed.

## Work Already Performed in the Working Tree

The items below are implemented but not yet fully validated as one integrated change set.

### Branch and safety

- Created `refactor/modular-architecture` from `feat/frontend-visual-refactor`.
- Captured migration checksums.
- Confirmed no migration file has been modified so far.

### Frontend tooling

- Added ESLint flat configuration with Angular and TypeScript rules.
- Split scripts into `format`, `format:check`, `lint`, `typecheck`, `test`, `test:coverage`, `build`, and `verify`.
- Added Node/npm engine metadata.
- Added Vitest coverage support.
- Upgraded Angular packages to 21.2.18 to remove the production Angular audit vulnerabilities.
- `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities after the upgrade.
- Applied ESLint autofixes and Prettier broadly. This is why many files show formatting-only changes.
- Applied `ChangeDetectionStrategy.OnPush` across components.
- Removed the `/dev/ui` route from `app.routes.ts`.

### Frontend boundaries

The domain clients and models were moved out of `core` and `shared` into feature-owned packages.

Current conceptual structure:

```text
src/app/
├── core/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── services/
│       ├── auth.ts
│       └── error-mapping.ts
├── features/
│   ├── branches/{domain,state}
│   ├── cash/{data-access,domain}
│   ├── catalog/{data-access,domain,presentation,ui}
│   ├── checkout/{data-access,state}
│   ├── dashboard/{data-access,domain,state,ui}
│   ├── inventory/{data-access,domain}
│   ├── orders/{data-access,domain}
│   ├── reports/{data-access,domain,ui}
│   ├── suppliers/{data-access,domain}
│   ├── users/{data-access,domain}
│   ├── admin/
│   ├── auth/
│   ├── customer/
│   └── public-store/
└── shared/
    ├── components/
    └── types/
```

- Added TypeScript aliases: `@core/*`, `@features/*`, and `@shared/*`.
- Added ESLint boundary rules that prevent production `core` from importing features and production `shared` from importing core/features.
- Moved storefront/catalog/report/dashboard-specific UI out of `shared/components`.
- Moved generic API error and page types to `shared/types`.
- Removed deprecated API error type re-exports from `ErrorMappingService`.

### Frontend correctness

- Scoped `DashboardStore` to the dashboard page instead of root.
- Scoped POS cart and POS data services to the POS page.
- Changed POS search toward a latest-request-wins `switchMap` flow.
- Sequenced F8 cash-session refresh before checkout submission.
- Replaced production `any` in the chart and signal-form input.
- Added runtime API error payload validation.
- Added `shared/types/api-error.spec.ts` for valid and malformed payloads.
- Changed the error interceptor to accept `unknown` and guard `HttpErrorResponse`.
- Removed repeated raw backend-message fallbacks from error mapping call sites.

### Backend tooling

- Added Maven Enforcer Java/Maven version checks.
- Added Spotless with ratcheted Java formatting.
- Added JaCoCo reporting and a provisional 60% bundle line threshold.
- Added SpotBugs high-severity analysis.
- Added ArchUnit test dependency.
- Added `backend/config/spotbugs-exclude.xml`.
- `./mvnw -DskipTests validate` currently passes.
- Full `mvn verify` has not yet been run with the new plugins.

### CI

- Added `.github/workflows/verify.yml` with frontend, backend, and container jobs.
- Frontend runs install and verification.
- Backend runs `mvn verify`.
- Container job validates Compose and builds both images.
- The workflow has not been executed remotely.

## Exact Current Broken Point

Do not start a new architectural phase before restoring a green frontend build.

The latest integrated frontend test command failed during Angular compilation with:

```text
NG2003: No suitable injection token for parameter 'http' of class 'AuthService'.
HttpClient was converted to a type-only import.
```

File:

```text
frontend/src/app/core/services/auth.ts
```

Required first fix:

```ts
import { HttpClient } from '@angular/common/http';
```

Do not use a type-only import for DI tokens.

This was introduced by an ESLint autofix. Search for the same problem before rerunning tests:

```bash
cd frontend
rg "import type .*HttpClient|import type .*Router|import type .*MessageService" src/app
```

Any class used as an Angular injection token must be imported as a runtime value.

After fixing it, run:

```bash
cd frontend
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

The most recent plain TypeScript typecheck passed before the final error-normalization edits. Angular template/DI compilation is the missing gate.

## Safe Execution Order

### Phase 0: Recover and checkpoint the current frontend refactor

Status: in progress

1. Fix all type-only DI token imports.
2. Run formatter, lint, typecheck, tests, and production build.
3. Fix failures caused by moved files, OnPush, scoped providers, and search cancellation.
4. Add or update tests for:
   - scoped `DashboardStore`;
   - scoped POS providers;
   - latest request wins in POS search;
   - F8 waits for the cash-session refresh;
   - malformed API error payloads;
   - no `/dev/ui` production route.
5. Verify there are no domain services in `core`.
6. Verify there are no business models/components in `shared`.
7. Verify migration diff is empty.

Acceptance commands:

```bash
cd frontend
npm run verify
npm run test:coverage
npm audit --omit=dev --audit-level=high
cd ..
git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration
```

### Phase 1: Stabilize quality tooling and CI

Status: partially implemented

1. Run `npm ci` from a clean dependency installation to prove lockfile reproducibility.
2. Ensure `npm run verify` is non-mutating.
3. Review frontend coverage output and add realistic thresholds only after measuring baseline.
4. Run backend `./mvnw verify`.
5. Fix Spotless, JaCoCo, and SpotBugs findings without broad suppressions.
6. Add the first ArchUnit tests before declaring backend tooling complete.
7. Validate Docker Compose using `docker/.env.example`.
8. Build both Docker images.
9. Review CI action pinning. Prefer immutable commit SHAs if project policy requires supply-chain pinning.

Do not weaken checks merely to make the pipeline green. If a provisional threshold is unrealistic, document measured coverage and choose a defensible incremental threshold.

### Phase 2: Complete frontend feature boundaries

Status: partially implemented

1. Inspect every file in `core` and retain only global infrastructure.
2. Inspect every file in `shared`; retain only domain-agnostic controls and generic types.
3. Add public feature entry points where another feature needs a contract.
4. Prevent imports of another feature's internal `pages`, `state`, or private UI.
5. Keep cross-feature dependencies directed through `domain`, `data-access`, or explicit public API files.
6. Decide whether role-specific pages remain under `features/admin` or move under each bounded feature. Prefer minimal churn if boundaries are already enforceable.
7. Remove obsolete barrels and deprecated compatibility exports after all consumers migrate.
8. Add architecture lint rules or a small dependency verification script for prohibited imports.

Required checks:

```bash
cd frontend
find src/app/core -type f | sort
find src/app/shared -type f | sort
rg "Product|Inventory|Order|Supplier|Cash|Dashboard|Recommendation|Payment" src/app/shared
rg "from '@features" src/app/core
npm run verify
```

Expected result: generic shared controls may use words in descriptive comments only; no business contracts or business UI should remain in shared.

### Phase 3: Refactor frontend inventory

Status: not started beyond moving client/model ownership

Hotspot:

```text
frontend/src/app/features/admin/inventory/inventory.ts
```

Target decomposition:

```text
features/inventory/
├── data-access/inventory.ts
├── domain/inventory.ts
├── state/inventory-page.store.ts
├── ui/inventory-toolbar/
├── ui/inventory-table/
├── ui/stock-lot-form/
├── ui/stock-adjustment-form/
└── pages/inventory-page/
```

Execution:

1. Add characterization tests for current list, filters, pagination, create-lot flow, and adjustment flow.
2. Extract pure request adapters and quantity/validation helpers first.
3. Extract stock lot and adjustment forms as presentational components with typed inputs/outputs.
4. Move HTTP subscriptions and request-state transitions into a page-scoped store/facade.
5. Use `switchMap` or request identity for filter changes.
6. Model loading, empty, data, and error states explicitly.
7. Keep branch authorization decisions in backend; frontend only controls visibility and selection.
8. Preserve existing API contracts and visual behavior.

### Phase 4: Refactor dashboard and reports frontend

Status: ownership and dashboard store scoping partially implemented

1. Verify dashboard auto-refresh cleanup after route destruction.
2. Replace overlapping refresh requests with latest-request-wins behavior.
3. Keep date range parsing in feature utilities, not components.
4. Move export adaptation out of page components.
5. Split report filter, chart mapping, table mapping, and recommendation rendering responsibilities.
6. Ensure a 404 is converted to `null` only for explicitly optional report endpoints.
7. Fix browser API warnings in test setup where practical.
8. Add store tests for loading, empty, stale response, recoverable failure, retry, and destroy behavior.

### Phase 5: Refactor remaining frontend features

Status: ownership moved; page decomposition mostly pending

Recommended order:

1. Orders and order detail
2. Cash open/detail/close
3. Suppliers and purchase orders
4. Pricing workflow
5. Products and categories
6. Users
7. Checkout and payment callback
8. Public catalog, home, and product detail

For each feature:

1. Add characterization tests.
2. Extract pure domain/presentation policies.
3. Extract forms, tables, filters, and dialogs only when they have independent responsibilities.
4. Introduce a page-scoped store only when state/effects justify it.
5. Cancel superseded requests.
6. Use typed forms.
7. Remove raw `HttpErrorResponse` traversal.
8. Run targeted tests, then full frontend verification.

Do not create wrappers or files only to reduce line count. Each extracted unit must have a coherent responsibility.

### Phase 6: Add backend architecture enforcement

Status: dependency added; tests not created

Create:

```text
backend/src/test/java/com/dietetica/lembas/architecture/ModularArchitectureTest.java
```

Initial rules:

1. Controllers do not depend on repositories.
2. Controllers do not depend on JPA entities as response contracts.
3. Repositories are only accessed from their owning module while migration is in progress, with a temporary explicit allowlist for known violations.
4. Module web packages depend inward on service/application and DTO/API packages.
5. Domain/model packages do not depend on web packages.
6. No field injection.
7. Shared packages do not depend on feature modules.

Use a shrinking allowlist rather than disabling the rule. Every module-boundary migration must remove entries from the allowlist.

Known cross-module repository violations to eliminate:

- auth -> users repository
- cash -> payments and users repositories
- catalog -> inventory repository
- inventory -> catalog and orders repositories
- orders -> catalog and inventory repositories
- payments -> orders repository
- POS -> catalog, inventory, and orders repositories
- suppliers -> catalog and inventory repositories

### Phase 7: Characterize and split backend inventory

Status: not started

Required preconditions:

1. Full backend tests green.
2. ArchUnit baseline in place.
3. Characterization tests cover all public `InventoryService` methods and consumers.
4. Inventory consumers enumerated with LSP or `rg`.
5. Transaction boundaries documented.

Target responsibilities:

```text
inventory/
├── api/
│   ├── InventoryFacade.java
│   ├── InventoryQuery.java
│   └── StockCommand.java
├── application/
│   ├── StockQueryService.java
│   ├── StockLotCommandService.java
│   ├── StockDeductionService.java
│   ├── StockAdjustmentService.java
│   └── StockReversalService.java
├── domain/
│   ├── FefoStockDeductionPolicy.java
│   └── explicit request/result records
├── infrastructure/
│   └── existing repositories
└── web/
```

Package names may remain partly compatible to reduce churn, but responsibilities and boundaries must become real.

Implementation sequence:

1. Make `FefoStockDeductionPolicy` a pure class without Spring annotations.
2. Add tests for invalid quantity, insufficient stock, zero lots, multiple lots, equal expiration dates, and null expiration ordering assumptions.
3. Extract stock query methods and DTO mapping.
4. Extract adjustment commands.
5. Extract reversal commands with idempotency protection at the order lock boundary.
6. Extract FEFO plan application that mutates already locked entities without re-querying each lot.
7. Route online and POS deduction through the inventory API.
8. Remove generic boolean flags and universal methods with ambiguous contexts.
9. Keep transaction boundaries in public application services.
10. Delete the old `InventoryService` after all consumers migrate; do not leave a compatibility facade unless it is the intentional public API.

### Phase 8: Fix critical backend transaction and concurrency defects

Status: not started

Order of implementation:

1. Add locked payment/order retrieval for webhook processing.
2. Make webhook approval idempotent under concurrent delivery.
3. Represent insufficient stock as an explicit inventory result or a transaction-safe application outcome.
4. Ensure `STOCK_CONFLICT` commits when stock cannot be deducted.
5. Reverse stock for refunded approved payments.
6. Lock cancellation so reversal occurs once.
7. Route POS deduction through inventory and mark zero lots `DEPLETED`.
8. Lock open cash sessions for POS sale, cash movement, and close coordination.
9. Lock purchase order items while confirming receipts.
10. Correct the manual deduction endpoint so it preserves reason and branch scope.

Required tests:

- approved webhook -> FEFO -> payment/order transition;
- concurrent duplicate webhook;
- insufficient stock commits `STOCK_CONFLICT` without partial stock changes;
- refund reverses exact original lots once;
- concurrent cancellation reverses once;
- POS marks depleted lots correctly;
- close versus POS sale race;
- close versus cash movement race;
- concurrent receipt confirmation cannot over-receive.

No sleeps. Use latches, barriers, transaction templates, and Testcontainers.

### Phase 9: Replace backend cross-module repository access

Status: not started

Migrate one boundary at a time. After every boundary, run relevant tests and remove the matching ArchUnit allowlist entry.

Suggested contracts:

- `users.api.UserDirectory` for authentication/user lookup
- `catalog.api.ProductCatalog` for product lookup and snapshots
- `inventory.api.InventoryFacade` for availability, FEFO deduction, receipt entry, and reversal
- `orders.api.OrderFacade` for payment/order coordination
- `payments.api.PaymentQuery` for cash totals and customer payment views
- `cash.api.CashSessionFacade` for POS session validation

Do not create one interface per class. Contracts are justified only at module boundaries.

Also:

1. Move payment query/mapping out of `CustomerPaymentController`.
2. Move supplier-owned stock receipt web behavior into supplier web ownership.
3. Replace field injection in `ReportQueryRepository` with constructor injection.
4. Avoid introducing entity DTO duplication without a consumer need.

### Phase 10: Normalize backend errors

Status: not started

1. Inventory all thrown `DomainException` codes.
2. Find generic `RuntimeException`, message-based identification, and controller-built errors.
3. Preserve the existing `ApiError` contract.
4. Add stable missing codes to documentation.
5. Ensure validation errors use one details shape.
6. Prevent raw internal exception messages from reaching clients.
7. Add MVC tests for validation, domain errors, authorization, malformed JSON, and unexpected failures.
8. Keep frontend mappings synchronized with stable codes.

### Phase 11: Harden production security

Status: only Angular package update and dev route removal completed

Required backend changes without migration edits:

1. Add production-only validated configuration that rejects placeholder JWT and Mercado Pago secrets.
2. Require production DB credentials and public HTTPS callback/webhook URLs.
3. Require explicit production allowed origins.
4. Disable Springdoc API docs and Swagger UI in production.
5. Explicitly reject HTTP TRACE in Spring Security and Nginx.
6. Keep local development defaults working only in dev/default profiles.
7. Force secure cookies in production while preserving local HTTP development.
8. Review trusted forwarded headers and origin validation.
9. Add security headers and tighten CSP without breaking Angular/PrimeNG.
10. Move ngrok to a development-only Compose profile and bind inspection to loopback.
11. Add regression tests for production startup rejection, Swagger disabled, TRACE rejection, cookie attributes, and origin validation.

Do not enable credentialed CORS unless deployment architecture requires it. The current design is primarily same-origin behind Nginx.

### Phase 12: Critical integration flows

Status: existing broad tests pass at baseline; missing cross-module critical integration tests remain

Prioritize:

#### POS

1. Open cash session.
2. Create sale.
3. Deduct FEFO stock.
4. Register approved manual payment.
5. Associate payment/order with cash session.
6. Query resulting state.
7. Close cash session and verify expected cash.

#### Online checkout

1. Create pending order.
2. Create payment preference.
3. Process signed approved webhook.
4. Verify idempotency.
5. Verify order/payment transition.
6. Verify FEFO stock deduction.
7. Verify rejection, stock conflict, cancellation, and refund reversal.

Use Testcontainers and fake gateway boundaries. Do not call Mercado Pago externally.

### Phase 13: Documentation

Status: this execution plan added; architecture docs not yet updated

Update only after implementation matches the text:

- `docs/03-architecture/frontend-architecture.md`
- `docs/03-architecture/backend-architecture.md`
- `docs/03-architecture/architecture-overview.md`
- `docs/05-api/api-guidelines.md`
- `docs/05-api/error-handling.md`
- `docs/06-development/frontend-conventions.md`
- `docs/06-development/backend-conventions.md`
- `docs/06-development/testing-strategy.md`
- `docs/06-development/setup.md`
- root and frontend README files where commands are stale
- `docs/ai-usage-log.md` with concise meaningful entries

Document actual architecture only, not aspirational packages that do not exist.

### Phase 14: Final verification

Run from a clean dependency/build state where practical:

```bash
cd frontend
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit --omit=dev --audit-level=high

cd ../backend
./mvnw clean verify

cd ..
docker compose --env-file docker/.env.example -f docker/compose.yml config --quiet
docker build --file docker/backend.Dockerfile --tag lembas-backend:verify .
docker build --file docker/frontend.Dockerfile --tag lembas-frontend:verify .

git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration
git status --short
```

Then perform manual architecture searches:

```bash
rg "com\.dietetica\.lembas\.[a-z]+\.repository" backend/src/main/java
rg "RuntimeException" backend/src/main/java
rg "providedIn: 'root'" frontend/src/app/features
rg "\bany\b" frontend/src/app --glob '!**/*.spec.ts'
rg "HttpErrorResponse" frontend/src/app/features
rg "from '@features" frontend/src/app/core
rg "from '@(core|features)" frontend/src/app/shared --glob '!**/*.spec.ts'
```

## Delegation Strategy for Cheaper Subagents

### General rules

- Give each agent a narrow, self-contained task with exact paths and tests.
- Never let two editing agents own the same files concurrently.
- Agents may inspect the full repository but must edit only their assigned paths.
- The orchestrating agent owns shared configuration files such as `pom.xml`, `package.json`, route files, architecture tests, and documentation unless explicitly delegated.
- Every subagent must report changed files, commands, results, and unresolved risks.
- Every subagent must verify migration diff is empty.
- Use characterization tests before risky business logic changes.
- Do not ask cheap agents to redesign multiple module boundaries at once.

### Safe parallel batches

#### Batch A: Frontend recovery and tests

These tasks should run sequentially until the frontend is green because they may touch shared configuration and moved imports.

1. Fix DI imports and moved provider tests.
2. Fix POS search/F8 tests.
3. Fix API error tests.
4. Run full frontend verification.

#### Batch B: Independent frontend feature decomposition

Can run in parallel only if path ownership is disjoint:

- Agent 1: `features/inventory` plus `features/admin/inventory`
- Agent 2: `features/dashboard` plus `features/admin/dashboard`
- Agent 3: `features/orders` plus `features/admin/orders`
- Agent 4: `features/cash` plus `features/admin/cash`

Do not let these agents edit shared components, global routes, package files, or error infrastructure.

#### Batch C: Backend characterization

Can run in parallel if agents add tests only:

- Agent 1: inventory characterization and FEFO tests
- Agent 2: webhook and refund characterization
- Agent 3: cash concurrency characterization
- Agent 4: purchase receipt concurrency characterization

Integrate and run the full suite before production refactoring.

#### Batch D: Backend module boundaries

Run sequentially by boundary to avoid constructor and Spring context conflicts:

1. users/auth
2. catalog/inventory
3. inventory/orders/POS
4. payments/orders/cash
5. suppliers/catalog/inventory

### Standard subagent prompt template

```text
Work on branch refactor/modular-architecture in /home/nacho/Documents/Lembas.

Read first:
- /home/nacho/Documents/Lembas/AGENTS.md
- [relevant Java or Angular skill path]
- /home/nacho/Documents/Lembas/docs/refactoring-execution-plan.md
- [relevant domain docs]

Task:
[one narrow objective]

Allowed edit paths:
[list exact directories/files]

Forbidden:
- Do not edit backend/src/main/resources/db/migration.
- Do not edit files outside the allowed paths.
- Do not commit or push.
- Do not use any, unsafe casts, suppressions, disabled tests, empty catches, or avoidable TODOs.
- Preserve behavior and existing API contracts.

Required process:
1. Inspect current implementation and consumers.
2. Add or update characterization tests first for risky logic.
3. Make the smallest cohesive change.
4. Run targeted formatting, typecheck/compilation, and tests.
5. Confirm migration diff is empty.

Report:
- Findings
- Files changed
- Tests added/updated
- Commands and exact results
- Remaining risks
```

### Prompt: frontend inventory agent

```text
Refactor only frontend inventory ownership and page responsibilities.
Allowed paths:
- frontend/src/app/features/inventory/**
- frontend/src/app/features/admin/inventory/**
- directly related specs in those paths

Do not modify package.json, tsconfig, ESLint, shared, core, routes, or other features.
First add characterization tests for filters, pagination, create lot, and adjustment. Extract pure adapters and coherent form/table UI. If a shared change is required, report it instead of editing it. Run npm run lint, npm run typecheck, targeted tests, and npm run build.
```

### Prompt: frontend dashboard agent

```text
Refactor only dashboard state and request concurrency.
Allowed paths:
- frontend/src/app/features/dashboard/**
- frontend/src/app/features/admin/dashboard/**

Ensure DashboardStore remains page-scoped, auto-refresh stops on destroy, and stale requests cannot overwrite newer selected-date results. Add behavior-focused store tests. Do not edit reports or shared files; report required cross-feature changes.
```

### Prompt: backend inventory characterization agent

```text
Add characterization tests only for InventoryService, FefoStockDeductionPolicy, InventoryStockDeductionAdapter, and repository lock behavior.
Allowed paths:
- backend/src/test/java/com/dietetica/lembas/inventory/**
- backend/src/test/java/com/dietetica/lembas/payments/** only for adapter-facing tests

Do not edit production code. Cover FEFO, adjustment signs/reasons, exact-lot reversal, branch scope, insufficient stock, and already locked entity behavior. Use Testcontainers only where PostgreSQL locking/order semantics matter.
```

### Prompt: backend inventory split agent

```text
Implement one extraction step from InventoryService only after characterization tests are green.
Allowed paths:
- backend/src/main/java/com/dietetica/lembas/inventory/**
- backend/src/test/java/com/dietetica/lembas/inventory/**

Do not edit consumers in POS/orders/payments in this task. Extract [one named responsibility] with transaction boundaries preserved. Do not add compatibility APIs unless existing consumers require them. Run targeted inventory tests and compile all backend tests.
```

### Prompt: ArchUnit agent

```text
Add architecture tests and a documented temporary allowlist for existing violations.
Allowed paths:
- backend/src/test/java/com/dietetica/lembas/architecture/**

Do not edit pom.xml or production code. Enforce controller/repository, web/domain, shared/module, and cross-module repository rules. The suite must pass against current code while naming every temporary violation explicitly. Return the allowlist entries in the report so the orchestrator can remove them incrementally.
```

## Progress Ledger

Use this table after every delegated task.

| Phase | Task | Owner | Status | Validation | Notes |
|---|---|---|---|---|---|
| 0 | Fix type-only DI imports | Unassigned | Blocked/current next | Not run | First required action |
| 0 | Green frontend moved architecture | Unassigned | In progress | Typecheck previously passed; Angular build failed | Run full frontend gates |
| 1 | Frontend quality scripts | Main agent | Implemented, pending full verify | Partial | ESLint/typecheck passed before latest edits |
| 1 | Backend quality plugins | Main agent | Implemented, pending verify | Maven validate passed | Full tests/coverage/static analysis pending |
| 1 | CI workflow | Main agent | Implemented, unexecuted | None | Validate locally and in GitHub |
| 2 | Move domain code out of core/shared | Main agent | Implemented, pending full verify | Typecheck passed before latest edits | Check Angular build/tests |
| 3 | Inventory frontend decomposition | Unassigned | Not started | None | Ownership move only |
| 4 | Dashboard lifecycle/concurrency | Unassigned | Partially started | Pending | Store is page-scoped |
| 6 | ArchUnit rules | Unassigned | Not started | None | Dependency already added |
| 7 | Inventory backend split | Unassigned | Not started | None | Characterization first |
| 8 | Backend concurrency defects | Unassigned | Not started | None | Highest correctness priority |
| 11 | Production security | Unassigned | Partially started | None | Angular upgrade and dev route removal only |
| 13 | Architecture docs | Unassigned | Not started | None | Update after code |
| 14 | Final verification | Unassigned | Not started | None | Must include migration check |

## Completion Report Requirements

The final report must include:

1. Summary of changes
2. Previous and resulting architecture
3. Main defects corrected
4. Refactored files/modules
5. Tests added or updated
6. Commands executed
7. Result of every validation
8. Architectural decisions and trade-offs
9. Remaining risks and schema-compatible limitations
10. Explicit confirmation that migrations and seeds were not modified

Do not claim completion while any configured build, format, lint, typecheck, test, static analysis, architecture, package, or production build gate fails.
