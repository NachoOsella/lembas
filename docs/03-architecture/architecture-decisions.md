# Architecture Decision Records (ADR)

| ID | Decision | Rationale |
|---|---|---|
| ADR-001 | Modular Monolith | Less complexity for a single-developer thesis. Avoids microservice overhead |
| ADR-002 | Separate storefront and backoffice in frontend | Different users (customers vs employees) need different interfaces |
| ADR-003 | PostgreSQL | Strong relational model for stock, sales, orders. Transaction support |
| ADR-004 | Direct Mercado Pago integration in payment services | Reduces abstraction for MVP; a payment abstraction can be added if a second provider is required |
| ADR-005 | No fiscal invoicing in MVP | Exceeds legal and technical scope of the thesis |
| ADR-006 | No external logistics in MVP | Manual internal delivery only. Pickup is the MVP fulfillment method |
| ADR-007 | Barcode reader as keyboard input | Simple, realistic, sufficient for MVP |
| ADR-008 | Rule-based recommendations (no AI) | Avoids hallucination and incorrect responses. Deterministic and predictable |
| ADR-009 | Human approval for mass price changes | Supplier price updates use reviewed batches; no file or percentage update is applied automatically |
| ADR-010 | Stock by branch from domain base | Enables future growth without redesign |
| ADR-011 | Online order associated with a single branch | Avoids split-order complexity between locations |
| ADR-012 | E-commerce without its own stock | Online stock is calculated from the branch's available stock |
| ADR-013 | Stock deducted at payment confirmation, not before | Simplifies flow: no reservation table. Reversal via cancellation movements |
| ADR-014 | Flyway for database migrations | Simple, versionable, sufficient for MVP |
| ADR-015 | Fixed roles as direct field in users | Simplifies initial security; eliminates roles and user_roles tables |
| ADR-016 | Current sale price directly on the product | `products.sale_price` is the operational price for POS and online store; history lives in `product_sale_price_history` |
| ADR-017 | Per-product promotions only (in MVP) | Reduces complexity. No category or lot promotions |
| ADR-018 | Current replacement cost per supplier product | `supplier_products.current_cost` stores the latest known replacement cost per product-supplier pair |
| ADR-019 | Product images on local file system | Simple, no external dependencies. Nginx serves static files |
| ADR-020 | Uniform API error format | All error responses use ApiError. Implemented with @ControllerAdvice |
| ADR-021 | Global HTTP interceptor in frontend for errors | Centralizes error handling |
| ADR-022 | Unified order (POS and ONLINE) | Eliminates duplication of sales and online_orders. Type distinguishes origin |
| ADR-023 | stock_lots as single source of truth | SUM(quantity_available). No branch_product_stock or stock_reservations |
| ADR-024 | No companies entity (single business) | Multi-company is a future vision |
| ADR-025 | No stock_reservations table | Stock deducted on payment approval. Reversed with CANCELLATION_RETURN |
| ADR-026 | Payments as separate table | Unifies online and in-store payments. Simplifies reports and traceability |
| ADR-027 | Label printing without persistence | REST endpoint generates PDF on demand. No label_print_jobs table |
| ADR-028 | Recommendations without query persistence | Rule-based recommender calculates in real-time |
| ADR-029 | stock_movements uses order_id as direct FK | Simplifies traceability queries |
| ADR-030 | order_items stores complete snapshots | Guarantees accurate historical reports |
| ADR-031 | products.online_status with DRAFT/PUBLISHED/PAUSED/HIDDEN | Single field covers all visibility states |
| ADR-032 | CHECK constraints on key tables | Prevents invalid data at database level |
| ADR-033 | [REJECTED] branch_product_stock as stock cache | stock_lots is sufficient |
| ADR-034 | cash_sessions for in-store cash management | Covers opening, movements, closing, and cash count |
| ADR-035 | Current replacement cost, cost history, and frozen lot unit cost are separate | `supplier_products.current_cost` is current replacement cost, `supplier_product_cost_history` stores changes, and `stock_lots.unit_cost` stores the immutable real received cost |
| ADR-036 | quantity as numeric(12,3) instead of integer | Supports fractional products |
| ADR-037 | products.current_cost removed | Cost is obtained from supplier_products |
| ADR-038 | Roles: ADMIN/MANAGER/EMPLOYEE/CUSTOMER | CUSTOMER included from MVP. No guest checkout |
| ADR-039 | Online purchase requires registration and login | No guest checkout |
| ADR-040 | Pickup only in MVP (no delivery) | Only PICKUP fulfillment. No home delivery |
| ADR-041 | Cart in frontend (localStorage) | No database persistence |
| ADR-042 | Mercado Pago Checkout Pro for online payments | Backend creates preferences, receives webhooks, verifies payments |
| ADR-043 | Cash register with cash count | All in-store sales require open register. Closing calculates cash difference |
| ADR-044 | Unified payments (payments table) | Shared table for online (MP) and in-store (cash register) payments |
| ADR-045 | STOCK_CONFLICT status for stock exceptions | If payment is approved but stock is insufficient, order goes to manual review |
| ADR-046 | order_type = POS for in-store sales | Identifies counter sales clearly |
| ADR-047 | Simple reports with direct queries | No aggregated tables or scheduled jobs |
| ADR-048 | Purchase orders do not affect stock; purchase receipts do | Orders represent expected purchases. Confirmed receipts create lots and `PURCHASE_ENTRY` movements |
| ADR-049 | Dedicated commercial price history | `product_sale_price_history` and `supplier_product_cost_history` are used for price history; `audit_logs` records actors and critical actions |

## ADR format

```markdown
# ADR-NNN: Title

## Status

Accepted / Proposed / Rejected

## Context

The circumstances that motivated this decision.

## Decision

What was decided and why.

## Consequences

Positive and negative effects of this decision.
```
