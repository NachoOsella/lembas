# Dietetica Lembas

**Integrated commercial management system with built-in e-commerce**

[![Status](https://img.shields.io/badge/Status-Planning-2ea44f?style=flat-square)]()
[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=java)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=spring)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=flat-square&logo=angular)](https://angular.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

This project is a **thesis** (TPF/Tesina) for a Systems Engineering degree. It is a single platform with a shared commercial core that serves both in-store sales (POS) and online sales (e-commerce), avoiding the common mistake of building two disconnected systems.

[Overview](#overview) · [Architecture](#architecture) · [Domain highlights](#domain-highlights) · [Documentation](#documentation) · [MVP scope](#mvp-scope) · [Status](#status)

---

## Overview

Dietetica Lembas is a health food store in Argentina. The system manages the full commercial cycle: products, stock by lot with expiration dates, in-store sales, online sales with Mercado Pago, cash register management, and operational reporting.

```text
Three integrated areas:
├── Backoffice / ERP     → products, stock, suppliers, POS, cash register, orders
├── E-commerce module    → public catalog, cart, Mercado Pago checkout, pickup
└── Intelligent assistant → rule-based recommendations (low stock, expiring, rotation)
```

> [!IMPORTANT]
> This is **not** an e-commerce glued to an ERP. It is one platform. Products, stock, orders, payments, and customers are shared entities. The sales channel (in-store vs online) is just a field on the order.

## Architecture

| Layer | Technology |
|---|---|
| **Backend** | Java 21, Spring Boot 3.5, JPA/Hibernate, Flyway |
| **Frontend** | Angular, Signals, PrimeNG, Tailwind CSS |
| **Database** | PostgreSQL 16 |
| **Payments** | Mercado Pago Checkout Pro (adapter pattern) |
| **Infra** | Docker Compose, Nginx |

### Style: Modular Monolith

The system is organized by domain modules. No microservices. No message queues. No Redis.

```text
backend/
├── auth/           JWT, registration, login
├── users/          Internal user management
├── catalog/        Products, categories
├── inventory/      Stock lots, FEFO, movements
├── orders/         Unified POS + ONLINE orders
├── payments/       Payment entity, Mercado Pago gateway
├── cash/           Cash register sessions and movements
├── suppliers/      Suppliers, product-supplier costs
├── reports/        Dashboard, cash report, recommendations
├── audit/          Audit logging
└── webhooks/       Mercado Pago webhook endpoint
```

The frontend follows the same separation:

```text
src/app/features/
├── public-store/   Catalog, product detail
├── customer/       Orders, checkout, profile
├── admin/          Dashboard, products, stock, POS, cash, orders, suppliers, reports, users
└── auth/           Login, registration
```

## Domain highlights

### Stock: lots + FEFO

Stock is tracked by lot with expiration dates. The system uses **FEFO** (First Expired, First Out) to determine which lot to consume first. Available stock is always calculated as `SUM(quantity_available) FROM stock_lots`. No denormalized counts, no reservation table.

### Unified orders

Orders share a single model. The `type` field distinguishes:
- `ONLINE` -- customer purchases via the web store, pays with Mercado Pago
- `POS` -- employee sells at the counter, payment goes through the cash register

### Unified payments

Payments also share a single model. `cash_session_id` is null for online payments (Mercado Pago) and required for in-store payments (associated with the open cash register).

### Cash register

The register controls physical cash. Other payment methods (QR, transfer, cards) are tracked but informational at close time. Closing compares expected cash vs counted cash and requires a mandatory explanation if they differ.

### 47 Architecture Decision Records

Every significant decision is documented as an ADR (see [architecture-decisions.md](docs/03-architecture/architecture-decisions.md)):

- Why modular monolith? (ADR-001)
- Why stock is only deducted on payment confirmation? (ADR-013)
- Why pickup only in MVP? (ADR-040)
- Why no stock_reservations table? (ADR-025)

## Documentation

The full documentation is in the [`docs/`](docs/) directory:

```text
docs/
├── 00-overview/          Project brief, scope, glossary
├── 01-product/           MVP definition, roadmap, epics, user stories, out-of-scope
├── 02-domain/            Domain model, entities, business rules, state machines
├── 03-architecture/      Architecture overview, backend, frontend, database, security,
│                         integrations, 47 ADRs
├── 04-processes/         Full sequence diagrams for all critical flows
├── 05-api/               API guidelines, endpoints, error handling, DTO conventions
├── 06-development/       Setup guide, coding standards, testing strategy
├── 07-deployment/        Docker, local environment, production deployment
└── 08-academic/          Thesis defense, technical justification, project risks,
                          evaluation criteria
```

> [!TIP]
> Start with [project-brief.md](docs/00-overview/project-brief.md) for a quick overview, or
> [architecture-decisions.md](docs/03-architecture/architecture-decisions.md) for the technical rationale behind every design choice.

### Quick reference

| If you want to understand... | Read this |
|---|---|
| What the system does | [project-brief.md](docs/00-overview/project-brief.md) |
| What is included (and excluded) | [scope.md](docs/00-overview/scope.md), [out-of-scope.md](docs/01-product/out-of-scope.md) |
| The data model and entities | [domain-model.md](docs/02-domain/domain-model.md) |
| The key business rules | [business-rules.md](docs/02-domain/business-rules.md) |
| How stock works | [stock-rules.md](docs/02-domain/stock-rules.md) |
| The order lifecycle | [state-machines.md](docs/02-domain/state-machines.md) |
| The Mercado Pago integration | [mercado-pago-flow.md](docs/04-processes/mercado-pago-flow.md) |
| How the cash register works | [cash-register-rules.md](docs/02-domain/cash-register-rules.md) |
| The complete API | [endpoints.md](docs/05-api/endpoints.md) |
| How to set up the dev environment | [setup.md](docs/06-development/setup.md) |

## MVP scope

The MVP is planned as **4 sprints of 2 weeks each** (48 user stories, ~300 story points):

| Sprint | Focus |
|---|---|
| Sprint 1 | Technical foundation, auth, admin catalog, public storefront |
| Sprint 2 | Stock by lots, FEFO, online orders, cart, suppliers |
| Sprint 3 | Mercado Pago, webhook, cash register, POS |
| Sprint 4 | Order states, cancellations, reports, audit, deployment |

### In scope

- Registered customers, JWT authentication, role-based access (ADMIN, MANAGER, EMPLOYEE, CUSTOMER)
- Product catalog with categories, barcodes, images, online publication status
- Stock by lot with expiration dates and FEFO deduction
- Online store with local cart, Mercado Pago Checkout Pro, and branch pickup
- In-store POS with barcode scanning and multi-method payment
- Cash register with opening, manual movements, closing with cash count
- Unified payments for both channels
- Supplier management with manual cost entry
- Operational dashboard, cash report, rule-based recommendations
- Audit logging for critical actions

### Explicitly out of scope

- Home delivery (pickup only)
- Fiscal invoicing (AFIP/ARCA)
- Mobile native app (responsive web)
- Multi-company / multi-tenant
- AI/LLM chatbot (rule-based only)
- Coupons and complex promotions
- Email/SMS/WhatsApp notifications

See [out-of-scope.md](docs/01-product/out-of-scope.md) for the full list with ADR references.

## Status

> [!NOTE]
> This repository currently contains the **full documentation** for the project. Backend and frontend code will be added as implementation progresses through the 4-sprint plan.

## Author

**Nacho Osella** -- Final Degree Project (TPF/Tesina)

---

[Documentation](docs/) · [Architecture decisions](docs/03-architecture/architecture-decisions.md) · [GitHub](https://github.com/NachoOsella/lembas)
