# Project Brief

## What is this system?

This project is an **integrated commercial management system with built-in e-commerce** for **Dietetica Lembas**, a small-to-medium health food store in Argentina.

It is not two separate applications (a backoffice and a storefront). It is a **single platform with a shared commercial core** that feeds both in-store sales and online sales from the same unified data and business logic.

## Who is it for?

The system is designed for three distinct user personas:

| Persona | Role | Primary Interface |
|---|---|---|
| Store administrators | ADMIN, MANAGER | Web backoffice |
| Store employees | EMPLOYEE | Web backoffice (POS, cash, orders) |
| Online customers | CUSTOMER | Public web storefront |

## What problem does it solve?

Dietetica Lembas currently operates with disconnected tools:

- A simple POS system for in-store sales
- Manual stock tracking (paper, spreadsheets)
- No online store presence
- No unified view of sales, stock, or cash across channels
- No traceability for inventory lots with expiration dates

This project eliminates those gaps by providing a single system that:

- Manages products, categories and pricing from one place
- Tracks stock by lot, branch and expiration date using FEFO (First Expired, First Out)
- Handles both in-store (POS) and online (e-commerce) sales with a unified order model
- Integrates with Mercado Pago Checkout Pro for online payments
- Provides cash register management with cash counting and discrepancy tracking
- Generates operational reports and rule-based recommendations

## What modules does it have?

| Module | Description |
|---|---|
| Auth | Registration (CUSTOMER), login, JWT, role-based access |
| Catalog | Categories, products, barcodes, images, online publication status |
| Inventory | Stock lots, FEFO deduction, movements, adjustments, expiry alerts |
| Orders | Unified POS and ONLINE orders, items with snapshots, state machine |
| Payments | Unified payment table, Mercado Pago integration, manual payments |
| Cash Register | Opening, manual movements, closing with cash count and discrepancy justification |
| POS (Point of Sale) | Fast product search, barcode scanning, multi-method payment |
| Suppliers | Supplier registry, product-supplier association with manual cost |
| Reports | Daily dashboard, cash closure report, rule-based recommendations |
| Audit | Logging of critical actions (price changes, stock adjustments, cancellations) |

## What is the differential value?

1. **Single shared core** -- not a storefront glued to an ERP. One engine powers both channels.
2. **Stock by lot with FEFO** -- critical for a health food store with perishable products.
3. **Unified orders and payments** -- same entities for in-store and online, enabling cross-channel reporting.
4. **Operational cash register** -- designed for the real way small stores work: cash is king, other methods are informational.
5. **Built for a single developer** -- modular monolith avoids microservice complexity while keeping domain separation.

## Thesis context

This project is the **Final Degree Project (TPF/Tesis)** for a Systems Engineering or related degree program. It is developed by a single student and must demonstrate competencies in:

- Software architecture and design
- Full-stack development (Angular + Spring Boot)
- Database design and transaction management
- External API integration (Mercado Pago)
- Testing strategy (unit, integration, E2E)
- Project planning and documentation
