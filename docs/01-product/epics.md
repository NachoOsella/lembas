# Epics (MVP)

13 epics covering the full MVP scope. Each epic groups user stories from one functional area.

| Key | Epic | Description | Sprint |
|---|---|---|---|
| EP-00 | Technical platform, quality and deployment | Cross-cutting foundation: project structure, Docker, profiles, error handling, testing, CI/CD, seed data, documentation, deployment | 1, 3, 4 |
| EP-01 | Authentication and registration | CUSTOMER registration, login, JWT, BCrypt, frontend session, security foundation | 1 |
| EP-02 | Catalog management | Categories, products, pricing, barcodes, single image, online status | 1 |
| EP-03 | Online store | Public catalog, local cart, authenticated checkout, own order history, payment result display | 1, 2, 3 |
| EP-04 | Mercado Pago Checkout Pro | Payment adapter, preference creation, webhook, idempotency, payment statuses | 3 |
| EP-05 | Stock | Stock by lot and branch, FEFO policy, movements, adjustments, expiry and low-stock alerts | 2, 3 |
| EP-06 | Orders | Unified POS/ONLINE orders, items with snapshots, state machine, preparation, delivery, cancellation | 2, 4 |
| EP-07 | Cash register | Opening, current session, manual movements, closing with cash count and discrepancy justification | 3 |
| EP-08 | In-store POS | Fast sale with name/barcode search, mandatory open register, multi-method payment, FEFO deduction | 3 |
| EP-09 | Unified payments | Shared payment table for online and in-store, methods, statuses, traceability | 2, 3 |
| EP-10 | Suppliers | Supplier CRUD, product-supplier association, manual current cost | 2 |
| EP-11 | Reports and recommendations | Dashboard, cash closure report, rule-based recommendations (low stock, expiring, rotation) | 4 |
| EP-12 | Users and roles | Internal user management, branch assignment, RBAC by role, dynamic menu by permissions | 1 |

## EP-00 -- Technical platform, quality and deployment

Cross-cutting project foundation: modular monolith structure, Docker Compose, dev/test profiles, uniform error handling, unit/integration/E2E testing, demo seed data, technical documentation, deployment configuration.

**Sprints:** 1, 3, 4
**Stories:** S1-US01 (structure), S1-US02 (Docker), S1-US03 (Flyway), S1-US11 (errors), S1-US12 (testing/demo), S3-US12 (critical tests), S4-US07 (audit), S4-US08 (security), S4-US09 (UX responsive), S4-US10 (E2E), S4-US11 (deployment), S4-US12 (documentation)

## EP-01 -- Authentication and registration

Customer registration with CUSTOMER role, JWT login, BCrypt, frontend session, foundation security. No guest checkout.

**Sprint:** 1
**Stories:** S1-US04 (register), S1-US05 (JWT login)

## EP-02 -- Catalog management

Backoffice administration of categories and products. Barcodes, sale price, brand as text, single image, online statuses (DRAFT/PUBLISHED/PAUSED/HIDDEN).

**Sprint:** 1
**Stories:** S1-US07 (categories), S1-US08 (products), S1-US09 (online status)

## EP-03 -- Online store

Public catalog with search and filters, local cart (localStorage), authenticated checkout, MP integration, customer order history, payment result.

**Sprints:** 1, 2, 3
**Stories:** S1-US10 (public catalog), S2-US05 (real availability), S2-US09 (local cart), S2-US10 (frontend confirmation), S2-US12 (own orders), S3-US05 (MP checkout frontend)

## EP-04 -- Mercado Pago Checkout Pro

Payment adapter (PaymentGateway), preference creation in MP, webhook with signature verification, idempotency by provider_payment_id, MP status mapping to internal PaymentStatus.

**Sprint:** 3
**Stories:** S3-US01 (adapter), S3-US02 (preference), S3-US03 (webhook)

## EP-05 -- Stock

Stock by lots as single source of truth, stock movements, testable FEFO policy, entries and manual adjustments. Expiry and low-stock alerts in reports.

**Sprints:** 2, 3
**Stories:** S2-US01 (lot model), S2-US02 (entries), S2-US03 (FEFO), S2-US04 (adjustments), S3-US04 (online FEFO deduction)

## EP-06 -- Orders

Unified POS/ONLINE orders with type, items with product snapshots, state machine, preparation and delivery flow, cancellation with stock reversal.

**Sprints:** 2, 4
**Stories:** S2-US06 (order model), S2-US08 (online order PENDING_PAYMENT), S4-US01 (preparation/pickup management), S4-US02 (cancellation), S4-US03 (backoffice orders)

## EP-07 -- Cash register

Cash opening with initial amount, single open session per branch validation, manual movements, closing with expected vs counted cash and mandatory discrepancy explanation.

**Sprint:** 3
**Stories:** S3-US06 (opening), S3-US07 (manual movements), S3-US08 (closing with cash count)

## EP-08 -- In-store sales POS

Fast sale with name or barcode search, mandatory open register, multiple payment methods (CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD), transactional FEFO deduction.

**Sprint:** 3
**Stories:** S3-US09 (POS search), S3-US10 (transactional sale), S3-US11 (POS screen)

## EP-09 -- Unified payments

Shared payments table for online (MERCADO_PAGO, CHECKOUT_PRO, cash_session_id null) and in-store (MANUAL, method per payment type, cash_session_id required). Statuses PENDING/APPROVED/REJECTED/CANCELLED/REFUNDED/EXPIRED/IN_PROCESS.

**Sprints:** 2, 3
**Stories:** S2-US07 (payment base), S3-US01 (MP adapter), S3-US02 (preference), S3-US03 (webhook)

## EP-10 -- Suppliers

Supplier registration, product-supplier association with supplier SKU and manual current cost. No automatic import in MVP.

**Sprint:** 2
**Stories:** S2-US11 (suppliers and costs)

## EP-11 -- Reports and recommendations

Daily operational dashboard (sales, pending orders, low stock, top products), cash closure report with totals by method, rule-based recommendations (LOW_STOCK, EXPIRING_SOON, HIGH_ROTATION, NO_MOVEMENT).

**Sprint:** 4
**Stories:** S4-US04 (dashboard), S4-US05 (cash report), S4-US06 (recommendations)

## EP-12 -- Users and roles

Internal user management (ADMIN, MANAGER, EMPLOYEE), mandatory branch assignment for MANAGER/EMPLOYEE, RBAC with @PreAuthorize, dynamic frontend menu by role.

**Sprint:** 1
**Stories:** S1-US06 (internal users and roles)
