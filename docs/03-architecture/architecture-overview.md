# Architecture Overview

## Architecture style

**Modular monolith** with frontend-backend separation.

```text
Frontend Angular (storefront + backoffice)
    ↓ HTTP REST
Backend Spring Boot (modules by feature)
    ↓ JPA/Hibernate
PostgreSQL 16
```

## Why modular monolith?

| Reason | Detail |
|---|---|
| Single developer | No need for microservice team coordination |
| Low complexity | One deployable unit, simpler debugging |
| Fast development | No inter-service communication overhead |
| Domain separation | Maintained by package structure, not network boundaries |
| Future migration | Modules can be extracted to microservices if needed |

## Architecture diagram

```mermaid
flowchart LR
    subgraph Client[Client / Browser]
        A[Angular Frontend]
    end
    subgraph Backend[Spring Boot Backend]
        C[API REST]
        D[Auth / Roles]
        E[Orders]
        F[Products / Catalog]
        G[Stock / Inventory]
        H[Suppliers]
        I[Reports / Recommendations]
    end
    subgraph Data[Persistence]
        N[(PostgreSQL)]
    end
    A --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    C --> I
    D --> N
    E --> N
    F --> N
    G --> N
    H --> N
    I --> N
```

## Technology stack

| Layer | Technology |
|---|---|
| Backend language | Java 21 |
| Backend framework | Spring Boot 3.5.x |
| ORM | Spring Data JPA / Hibernate |
| Database migrations | Flyway |
| Database | PostgreSQL 16 |
| Authentication | JWT (24h tokens) |
| Password hashing | BCrypt |
| API documentation | Springdoc OpenAPI |
| Frontend framework | Angular (standalone components) |
| Frontend state | Signals |
| UI component library | PrimeNG |
| CSS framework | Tailwind CSS |
| Containerization | Docker Compose |
| Reverse proxy | Nginx |
| Testing (backend) | JUnit 5, Mockito, Testcontainers |
| Testing (frontend) | Vitest 4, jsdom 28 |
| Static analysis (backend) | SpotBugs, Spotless, Maven Enforcer |
| Static analysis (frontend) | ESLint, Prettier |
| API docs | Springdoc OpenAPI (Swagger UI) |

## Module dependency map

```text
auth       -- No dependencies
users      -- auth
catalog    -- auth
content    -- auth (no persistence, serves hardcoded content)
inventory  -- catalog, auth, users, suppliers
orders     -- catalog, inventory, payments, users, auth
payments   -- orders, inventory, cash, auth (plus external Mercado Pago)
cash       -- auth, users
pos        -- inventory, orders, cash, payments, catalog, auth, users
suppliers  -- catalog, auth, users
reports    -- catalog, inventory, orders, payments, cash, users, auth
audit      -- auth
shared     -- (utilized by all modules; branch, security, DTOs, exceptions)
```

## Key architectural decisions

1. **Modular monolith with owned API contracts** -- Modules expose `api/` packages for cross-module calls; ArchUnit enforces boundary rules.
2. **Unified Order model** -- POS and ONLINE sales share the same entity.
3. **Unified Payment model** -- Online and in-store payments share the same entity.
4. **Stock lots as source of truth** -- No denormalized stock counts.
5. **Localized external integrations** -- Mercado Pago calls and webhook handling are kept in the payments module.
6. **Pessimistic locking for stock operations** -- SELECT FOR UPDATE to prevent overselling.
7. **Stock deducted at payment confirmation** -- Not at order creation, not at delivery.
8. **Cash register controls physical cash only** -- Other methods are informational at close.
9. **Frontend public feature APIs** -- Each feature exports a `public-api.ts`; cross-feature deep imports are rejected by the boundary checker.
10. **Deterministic concurrency testing** -- Critical race scenarios use latches, barriers, and `TransactionTemplate`, never thread sleeps.
