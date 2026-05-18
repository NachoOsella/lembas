# Thesis Defense

## Project summary

**Title:** Integrated Commercial Management System with E-commerce for Dietetica Lembas

**Type:** Final Degree Project (TPF/Tesis)

**Student:** Single developer

**Duration:** 4 sprints of 2 weeks each (8 weeks total)

## Thesis statement

> How to build a unified commercial platform that serves both in-store and online sales from a single shared core, avoiding the common mistake of building two disconnected systems.

## Defense argument

### The problem

Small retailers in Argentina face a fragmented technology landscape:
- POS systems that do not talk to e-commerce platforms
- Stock tracked on paper or spreadsheets
- No unified view of sales, cash, or inventory
- Perishable products requiring FEFO management
- Manual price updates across multiple channels
- No actionable commercial metrics for decision-making

### The solution: three integrated areas

The system is structured in three interconnected areas:

1. **Backoffice / ERP** -- manages products, stock, suppliers, in-store sales, cash register, orders, and reports
2. **E-commerce module** -- public catalog, local cart, Mercado Pago checkout, pickup fulfillment
3. **Intelligent assistant** -- rule-based recommendations (low stock, expiring products, rotation analysis, no-movement detection)

All three areas share a single commercial core. No data silos, no duplication.

### Why it is not two systems

The core insight: building an ERP and an e-commerce separately and integrating them later is a common failure pattern. This system builds a single commercial core that feeds both channels. Products, stock, orders, payments, and customers are shared entities. The channel (in-store vs online) is just a field on the order.

The system goes beyond simple CRUD because it implements complete business processes:
- Online purchase with real-time stock validation
- Order state machine with full traceability
- Payment lifecycle with webhook-driven status updates
- In-store sale with automatic FEFO stock deduction
- Cash register with discrepancy detection and audit trail
- Rule-based recommendations using actual catalog and stock data
- Assisted price tracking with supplier cost comparison

### Key technical decisions

1. **Modular monolith** over microservices (single developer, low complexity)
2. **Unified order model** (POS and ONLINE share the same table)
3. **Stock lots as source of truth** (no denormalized stock counts, FEFO built in)
4. **Stock deducted on payment confirmation** (no separate reservation table)
5. **Mercado Pago integration** (localized payment processing and webhook handling)
6. **Cash register controls physical cash only** (other methods are informational at close)
7. **Rule-based recommendations over AI** -- deterministic, predictable, no hallucination

## What the MVP demonstrates

| Competency | Evidence |
|---|---|
| Full-stack development | Angular (Signals, standalone components) + Spring Boot from scratch |
| Database design | 14+ tables, relational integrity, CHECK constraints, Flyway migrations |
| External API integration | Mercado Pago Checkout Pro with webhook idempotency |
| Transaction management | FEFO stock deduction with pessimistic locking (SELECT FOR UPDATE) |
| Testing strategy | Unit (domain policies), integration (Testcontainers), E2E (critical flows) |
| Project management | Scrum with 4 sprints, 48 user stories, 300 story points, Jira tracking |
| Software architecture | Modular monolith, layered architecture, DTO mapping |
| Security | JWT, BCrypt, role-based access (4 roles), route guards, audit logging |
| Business process modeling | Full sequence diagrams for all 4 critical workflows |
