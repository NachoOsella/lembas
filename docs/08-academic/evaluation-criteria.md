# Evaluation Criteria

## What the system must demonstrate

The MVP is evaluated on whether it successfully demonstrates:

### 1. End-to-end commerce flow

```text
A customer must be able to:
  → Register and login
  → Browse products in the online catalog
  → Add items to a local cart
  → Confirm an order
  → Pay with Mercado Pago
  → Track order status until pickup

An employee must be able to:
  → Open the cash register
  → Sell products via POS
  → Process payments (cash, QR, transfer, cards)
  → Prepare and deliver online orders
  → Close the cash register with cash count
```

### 2. Business-critical rules

```text
- FEFO stock deduction (expiring lots deducted first)
- Stock deducted on payment confirmation (not before)
- Cash register discrepancy requires explanation
- Online payments via Mercado Pago webhook with idempotency
- Role-based access control (CUSTOMER vs ADMIN vs EMPLOYEE)
```

### 3. Architectural quality

```text
- Modular monolith structure (domain-separated modules)
- Unified order and payment models
- Adapter pattern for external integrations
- Pessimistic locking for concurrent stock operations
- Flyway database migrations
- Standardized API error format
- Angular Signals for state management
- Lazy loading in frontend
```

## Evaluation criteria by area

| Area | Criteria | Evidence |
|---|---|---|
| Architecture | Clean separation of concerns, modular monolith, documented ADRs | architecture-overview.md, ADR documents, backend module structure |
| Backend | Spring Boot best practices, layered architecture, transactional integrity | backend-architecture.md, controller/service/repository pattern |
| Frontend | Angular best practices, Signals, component design, error handling | frontend-architecture.md, component structure |
| Database | Normalized schema, constraints, indexes, migration strategy | database-design.md, Flyway migrations |
| Integration | Mercado Pago adapter pattern, webhook idempotency | integrations.md, mercado-pago-flow.md |
| Testing | Unit, integration, and E2E coverage for critical flows | testing-strategy.md, test suite |
| Security | JWT, BCrypt, role-based access, route guards | security-architecture.md |
| Domain | FEFO, unified orders/payments, cash register logic | domain-model.md, business-rules.md |
| Process | Scrum planning, user stories, sprint management | roadmap.md, epics.md, user-stories.md |
| Documentation | Architecture decisions, API docs, process flows, setup guide | Full docs/ directory |

## MVP completion criteria

The MVP is considered complete when:

1. A customer can complete the full online purchase cycle (register -> browse -> cart -> order -> pay -> pickup)
2. An employee can complete the full in-store sale cycle (open register -> build sale -> charge -> close register)
3. Stock is correctly deducted and tracked using FEFO
4. Cash register closing correctly handles discrepancies
5. The system is deployable with Docker Compose
6. Documentation covers architecture, setup, API, and domain rules
