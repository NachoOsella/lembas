# Business Context

## About Dietetica Lembas

Dietetica Lembas is a health food store (dietetica) located in Argentina. It sells natural products, organic groceries, supplements, cereals, dried fruits, and related items. The business serves both walk-in customers (the primary channel today) and increasingly, customers who expect online ordering capabilities.

### Business characteristics

| Aspect | Detail |
|---|---|
| Business size | Small to medium (PyME) |
| Branches | 1 initially, potential expansion to 2-3 |
| Customer base | Local neighborhood clients and online shoppers |
| Product type | Perishable and non-perishable health foods |
| Regulatory context | Argentine consumer protection laws, no fiscal invoicing in MVP |
| Payment methods | Cash, QR (Mercado Pago), bank transfer, debit card, credit card |

## Market context

Small retail businesses in Argentina face specific challenges:
- High inflation makes pricing and cost tracking critical
- Cash flow management is a daily concern
- Customers increasingly expect online ordering even from small local stores
- Multiple payment methods must be supported (cash is still king, but digital payments are growing)

## Why this project matters

For the degree thesis, this project demonstrates:

| Competency | How it is shown |
|---|---|
| Software architecture | Modular monolith design; separation of concerns by domain |
| Full-stack development | Angular frontend + Spring Boot backend from scratch |
| Database design | Normalized relational model with transactional integrity |
| External integration | Mercado Pago Checkout Pro |
| Business process modeling | Sequence diagrams for all critical flows |
| Testing strategy | Unit, integration, and E2E testing with realistic scenarios |
| Project management | Scrum-based planning with 4 sprints, 48 user stories, 300 story points |

## Key business rules

1. Products have a current sale price for POS and online store. Price history is kept in a dedicated sale price history table; audit logs record who changed it.
2. Stock is tracked by lot with expiration dates, real received unit cost, and FEFO compliance.
3. Online orders require customer registration (no guest checkout).
4. In-store sales require an open cash register.
5. Cash register closing requires counting physical cash and justifying discrepancies.
6. Online payments go through Mercado Pago Checkout Pro.
7. Stock is deducted when payment is confirmed, not when the order is created.
