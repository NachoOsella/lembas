<p align="center">
  <img src="frontend/public/brand/lembas-logo.png" alt="Dietetica Lembas" width="220">
</p>

<h1 align="center">Dietetica Lembas</h1>

<p align="center">
  Integrated commercial management system with built-in e-commerce for a health food store.
</p>

<p align="center">
  <a href="docs/00-overview/project-brief.md">Overview</a> ·
  <a href="docs/03-architecture/architecture-overview.md">Architecture</a> ·
  <a href="docs/05-api/endpoints.md">API</a> ·
  <a href="docs/06-development/setup.md">Setup</a> ·
  <a href="AGENTS.md">AI handover</a>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-development-2ea44f?style=flat-square">
  <img alt="Java" src="https://img.shields.io/badge/Java-21-ED8B00?style=flat-square">
  <img alt="Spring Boot" src="https://img.shields.io/badge/Spring%20Boot-3.5.0-6DB33F?style=flat-square">
  <img alt="Angular" src="https://img.shields.io/badge/Angular-21.2-DD0031?style=flat-square">
  <img alt="PrimeNG" src="https://img.shields.io/badge/PrimeNG-21.1.7-9C27B0?style=flat-square">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square">
</p>

---

## What is this?

**Dietetica Lembas** is a full-stack thesis project for a small health food store in Argentina. It combines backoffice, POS, inventory, e-commerce, payments, and reporting in one shared commercial core.

The key idea is simple: **the store and the POS use the same products, stock, orders, payments, and customers**. The sales channel is a field on the order, not a separate system.

> [!IMPORTANT]
> This is a modular monolith, not a microservices project. There are no queues, Redis, duplicated POS/e-commerce models, guest checkout, home delivery, fiscal invoicing, or AI chatbot in the MVP.

## Features

### Implemented foundation

- Java 21 + Spring Boot 3.5 backend with security, validation, OpenAPI, Flyway, and Testcontainers.
- Angular 21 standalone frontend with lazy routes, signals, PrimeNG, Tailwind CSS 4, Vitest, and jsdom.
- Docker Compose stack for PostgreSQL, backend, frontend, and Nginx reverse proxy.
- JWT authentication, registration, login, `/api/auth/me`, and API auth interceptor.
- Admin user management with roles and branch policy checks.
- Catalog and category management with publication status.
- Public store catalog, product detail, cart service, storefront shell, and reusable design-system components.
- Centralized API error handling with backend `ApiError`, global exception handler, frontend interceptor, and mapped UI messages.
- Seed data and Flyway migrations for local development.

### Planned MVP capabilities

- Stock by branch and lot with FEFO deduction.
- Unified POS and online orders.
- Mercado Pago Checkout Pro and idempotent webhooks.
- Cash register opening, movements, and close discrepancy tracking.
- Supplier management, operational reports, audit logging, and rule-based recommendations.

## Architecture

| Layer | Stack |
|---|---|
| Backend | Java 21, Spring Boot 3.5.0, Spring Security, JPA/Hibernate, Flyway, springdoc-openapi |
| Frontend | Angular 21.2, standalone components, signals, PrimeNG 21.1, Aura theme, Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| Testing | JUnit 5, AssertJ, Spring MVC tests, Testcontainers, Vitest 4, jsdom 28 |
| Infrastructure | Docker Compose, Nginx, Maven Wrapper, npm 11 |
| Payment provider | Mercado Pago Checkout Pro |

```text
backend/src/main/java/com/dietetica/lembas/
  auth/        registration, login, JWT, user details
  users/       internal users, roles, branch policy
  catalog/     categories, products, online publication
  inventory/   stock lots, FEFO, movements (planned)
  orders/      unified POS + ONLINE orders (planned)
  payments/    unified payments + Mercado Pago (planned)
  cash/        cash register sessions (planned)
  suppliers/   suppliers and manual costs (planned)
  reports/     dashboards and recommendations (planned)
  audit/       critical action logging (planned)
  shared/      errors, config, branches, shared web concerns
```

```text
frontend/src/app/
  core/       guards, interceptors, application services
  features/   public-store, auth, customer, admin, dev showcase
  shared/     models and PrimeNG-first reusable UI components
```

> [!TIP]
> See [`docs/03-architecture/architecture-decisions.md`](docs/03-architecture/architecture-decisions.md) for the ADRs behind the main decisions: modular monolith, unified orders, stock timing, pickup-only MVP, DTO boundaries, security, audit, and testing.

## Domain highlights

- **Stock by lot:** inventory is tracked through `stock_lots`, including expiration dates.
- **FEFO:** lots with the earliest expiration date are consumed first; lots without expiration dates are consumed last.
- **Stock timing:** stock is deducted only when payment is confirmed.
- **Unified orders:** `POS` and `ONLINE` orders share one model.
- **Unified payments:** cash-session linkage is required for in-store payments and absent for online payments.
- **Cash register:** physical cash is reconciled; QR, transfers, and cards are informational at close.
- **Pickup only:** online purchases are picked up at the branch in the MVP.

## Quick start

### Prerequisites

- Java 21+
- Docker and Docker Compose
- Node.js compatible with Angular 21
- npm 11+

### Full Docker stack

```bash
cd docker
cp .env.example .env
# Edit secrets and ports if needed.
docker compose --env-file .env up -d --build
```

Useful URLs:

| Service | URL |
|---|---|
| Web app | `http://localhost` |
| Backend API through Nginx | `http://localhost/api` |
| Backend direct dev URL | `http://localhost:8080` |
| Swagger UI | `http://localhost/swagger-ui.html` |
| OpenAPI JSON | `http://localhost/api-docs` |
| Health check | `http://localhost/actuator/health` |

### Local development

Start only PostgreSQL:

```bash
cd docker
cp .env.example .env
docker compose --env-file .env up -d db
```

Run the backend:

```bash
cd backend
./mvnw test
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Run the frontend:

```bash
cd frontend
npm install
npm start
```

The Angular dev server proxies `/api` requests to `localhost:8080`.

## Common commands

| Task | Command |
|---|---|
| Backend tests | `cd backend && ./mvnw test` |
| Backend dev server | `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` |
| Frontend install | `cd frontend && npm install` |
| Frontend dev server | `cd frontend && npm start` |
| Frontend tests | `cd frontend && npm run test` |
| Frontend production build | `cd frontend && npm run build` |
| Start DB from frontend folder | `cd frontend && npm run docker:up` |
| Stop DB from frontend folder | `cd frontend && npm run docker:down` |
| Reset local database | `./scripts/reset-db.sh` |

## Database and migrations

Flyway migrations live in:

```text
backend/src/main/resources/db/migration/
```

The current schema includes core users/branches, catalog entities, refresh tokens, and demo seed data. Migrations run automatically when the backend starts.

```bash
cd backend
./mvnw flyway:info
./mvnw flyway:migrate
```

For a clean local reset:

```bash
./scripts/reset-db.sh
```

## Documentation map

| Topic | Document |
|---|---|
| Project overview | [`docs/00-overview/project-brief.md`](docs/00-overview/project-brief.md) |
| Scope and exclusions | [`docs/00-overview/scope.md`](docs/00-overview/scope.md), [`docs/01-product/out-of-scope.md`](docs/01-product/out-of-scope.md) |
| MVP and stories | [`docs/01-product/mvp.md`](docs/01-product/mvp.md), [`docs/01-product/user-stories.md`](docs/01-product/user-stories.md) |
| Domain model | [`docs/02-domain/domain-model.md`](docs/02-domain/domain-model.md) |
| Business rules | [`docs/02-domain/business-rules.md`](docs/02-domain/business-rules.md) |
| State machines | [`docs/02-domain/state-machines.md`](docs/02-domain/state-machines.md) |
| Architecture overview | [`docs/03-architecture/architecture-overview.md`](docs/03-architecture/architecture-overview.md) |
| API reference | [`docs/05-api/endpoints.md`](docs/05-api/endpoints.md) |
| Error handling | [`docs/05-api/error-handling.md`](docs/05-api/error-handling.md) |
| Development setup | [`docs/06-development/setup.md`](docs/06-development/setup.md) |
| Docker deployment | [`docker/README.md`](docker/README.md) |
| AI-assisted handover | [`AGENTS.md`](AGENTS.md), [`docs/ai-usage-log.md`](docs/ai-usage-log.md) |

## Project structure

```text
lembas/
  backend/      Spring Boot backend and Flyway migrations
  frontend/     Angular application and design-system components
  docker/       Compose stack, Dockerfiles, and Nginx config
  docs/         Product, domain, architecture, API, development, deployment docs
  scripts/      Local maintenance scripts
  AGENTS.md     Compact project knowledge base for AI-assisted development
```

## Author

**Nacho Osella** — Final Degree Project (TPF/Tesina)
