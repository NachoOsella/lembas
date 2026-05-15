# Dietetica Lembas -- Commercial Management System with Integrated E-commerce

This repository contains the full technical documentation for the **Dietetica Lembas** thesis project: an integrated commercial management platform with a built-in e-commerce module.

The system is not two separate applications (backoffice + storefront). It is a **single platform with a shared commercial core** that feeds both in-store sales and online sales from the same unified data and business logic.

## Architecture

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.5.x, JPA/Hibernate |
| Frontend | Angular, Signals, PrimeNG, Tailwind CSS |
| Database | PostgreSQL 16, Flyway migrations |
| Payments | Mercado Pago Checkout Pro (adapter pattern) |
| Deployment | Docker Compose, Nginx |

## Documentation index

Start here to understand the project:

```
docs/
├── 00-overview/         project-brief, scope, glossary
├── 01-product/          mvp, roadmap, epics, user-stories, out-of-scope
├── 02-domain/           domain-model, business-rules, stock-rules, order-rules,
│                        payment-rules, cash-register-rules, state-machines
├── 03-architecture/     overview, backend, frontend, database, security,
│                        integrations, architecture-decisions (47 ADRs)
├── 04-processes/        full sequence diagrams for all critical flows
├── 05-api/              api-guidelines, endpoints, error-handling, dto-conventions
├── 06-development/      setup, coding-standards, conventions, testing-strategy
├── 07-deployment/       docker, local-environment, production-deployment
└── 08-academic/         thesis-defense, technical-justification, project-risks
```

## Quick links

| Purpose | File |
|---|---|
| Project overview | [docs/00-overview/project-brief.md](docs/00-overview/project-brief.md) |
| MVP scope | [docs/01-product/mvp.md](docs/01-product/mvp.md) |
| What is excluded | [docs/01-product/out-of-scope.md](docs/01-product/out-of-scope.md) |
| Domain model | [docs/02-domain/domain-model.md](docs/02-domain/domain-model.md) |
| Architecture overview | [docs/03-architecture/architecture-overview.md](docs/03-architecture/architecture-overview.md) |
| Architecture decisions | [docs/03-architecture/architecture-decisions.md](docs/03-architecture/architecture-decisions.md) |

## Author

**Nacho Osella** -- Final Degree Project (TPF/Tesis)

## License

Academic project. All rights reserved.
