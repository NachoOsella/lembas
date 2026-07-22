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
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square">
</p>

---

## What is this?

**Dietetica Lembas** is a full-stack thesis project for a small health food store in Argentina. It combines backoffice, POS, inventory, e-commerce, payments, and reporting in one shared commercial core.

The key idea: **the store and the POS use the same products, stock, orders, payments, and customers**. The sales channel is a field on the order, not a separate system.

> [!IMPORTANT]
> This is a modular monolith, not a microservices project. The MVP excludes queues, Redis, duplicated POS/e-commerce models, guest checkout, home delivery, fiscal invoicing, and AI chatbot features.

## Current scope

Implemented foundation:

- Spring Boot backend with JWT auth, validation, OpenAPI, Flyway, Testcontainers, and centralized API errors.
- Angular standalone frontend with lazy routes, signals, PrimeNG, Tailwind CSS 4, Vitest, auth guards, interceptors, and reusable UI components.
- Docker Compose stack for PostgreSQL, backend, frontend, and Nginx.
- Registration, login, `/api/auth/me`, admin user management, branch policy checks, categories, products, publication status, public catalog, product detail, cart state, and seed data.

Planned MVP flows:

- Stock by branch and lot with FEFO deduction.
- Unified POS and online orders.
- Mercado Pago Checkout Pro and idempotent webhooks.
- Cash register opening, movements, and close discrepancy tracking.
- Suppliers, operational reports, audit logging, and rule-based recommendations.

## Architecture

| Layer | Stack |
|---|---|
| Backend | Java 21, Spring Boot 3.5.0, Spring Security, JPA/Hibernate, Flyway, springdoc-openapi |
| Frontend | Angular 21.2, standalone components, signals, PrimeNG 21.1, Aura theme, Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| Testing | JUnit 5, AssertJ, Spring MVC tests, Testcontainers, Vitest 4, jsdom 28 |
| Infrastructure | Docker Compose, Nginx, Maven Wrapper, npm 11 |
| Payments | Mercado Pago Checkout Pro |

```text
backend/src/main/java/com/dietetica/lembas/
  auth/ users/ catalog/ inventory/ orders/ payments/ cash/
  suppliers/ reports/ audit/ shared/

frontend/src/app/
  core/ features/ shared/
```

> [!TIP]
> See [`docs/03-architecture/architecture-decisions.md`](docs/03-architecture/architecture-decisions.md) for the ADRs behind the main decisions: modular monolith, unified orders, stock timing, pickup-only MVP, DTO boundaries, security, audit, and testing.

## Domain highlights

- **Stock by lot:** inventory tracks branch, lot, quantity, and expiration date.
- **FEFO:** first-expired lots are consumed first; lots without expiration dates are consumed last.
- **Stock timing:** stock is deducted only when payment is confirmed.
- **Unified orders:** `POS` and `ONLINE` orders share one model.
- **Cash register:** physical cash is reconciled; QR, transfers, and cards are informational at close.
- **Pickup only:** online purchases are picked up at the branch in the MVP.

## Quick start

### Full Docker stack

```bash
cd docker
cp .env.example .env
# Edit secrets and ports if needed.
docker compose --env-file .env up -d --build
```

| Service | URL |
|---|---|
| Web app | `http://localhost` |
| Backend API | `http://localhost/api` |
| Swagger UI | `http://localhost/swagger-ui.html` |
| OpenAPI JSON | `http://localhost/api-docs` |
| Health check | `http://localhost/actuator/health` |

### Local development

```bash
# Start PostgreSQL
cd docker
cp .env.example .env
docker compose --env-file .env up -d db

# Run backend
cd ../backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Run frontend
cd ../frontend
npm install
npm start
```

## Commands

| Task | Command |
|---|---|
| Backend tests | `cd backend && ./mvnw test` |
| Backend verify | `cd backend && ./mvnw clean verify` |
| Frontend tests | `cd frontend && npm run test` |
| Frontend verify | `cd frontend && npm run verify` |
| Frontend boundaries | `cd frontend && npm run boundaries` |
| Frontend coverage | `cd frontend && npm run test:coverage` |
| Frontend build | `cd frontend && npm run build` |
| Start DB only | `cd frontend && npm run docker:up` |
| Stop DB | `cd frontend && npm run docker:down` |
| Reset database | `./scripts/reset-db.sh` |
| Docker stack | `docker compose --env-file docker/.env -f docker/compose.yml up --build` |

## Documentation

| Topic | Document |
|---|---|
| Project overview | [`docs/00-overview/project-brief.md`](docs/00-overview/project-brief.md) |
| Scope and exclusions | [`docs/00-overview/scope.md`](docs/00-overview/scope.md), [`docs/01-product/out-of-scope.md`](docs/01-product/out-of-scope.md) |
| MVP and stories | [`docs/01-product/mvp.md`](docs/01-product/mvp.md), [`docs/01-product/user-stories.md`](docs/01-product/user-stories.md) |
| Domain model and rules | [`docs/02-domain/domain-model.md`](docs/02-domain/domain-model.md), [`docs/02-domain/business-rules.md`](docs/02-domain/business-rules.md) |
| Architecture | [`docs/03-architecture/architecture-overview.md`](docs/03-architecture/architecture-overview.md) |
| API | [`docs/05-api/endpoints.md`](docs/05-api/endpoints.md), [`docs/05-api/error-handling.md`](docs/05-api/error-handling.md) |
| Development and Docker | [`docs/06-development/setup.md`](docs/06-development/setup.md), [`docker/README.md`](docker/README.md) |
| AI-assisted handover | [`AGENTS.md`](AGENTS.md), [`docs/ai-usage-log.md`](docs/ai-usage-log.md) |

## Project structure

```text
lembas/
  backend/   Spring Boot backend and Flyway migrations
  frontend/  Angular application and design-system components
  docker/    Compose stack, Dockerfiles, and Nginx config
  docs/      Product, domain, architecture, API, development, deployment docs
  scripts/   Local maintenance scripts
```

## Author

**Nacho Osella** — Final Degree Project (TPF/Tesis)
