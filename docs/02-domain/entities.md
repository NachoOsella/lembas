# Entities

## Entity summary (14 tables in MVP)

| # | Table | Domain | Purpose |
|---|---|---|---|
| 1 | `branches` | Core | Physical store locations. MVP has 1, but model supports multiple |
| 2 | `users` | Core | All system users. Role stored as direct field (no roles table) |
| 3 | `categories` | Catalog | Product categories, supports parent-child tree |
| 4 | `products` | Catalog | Salable products with price, barcode, online status |
| 5 | `suppliers` | Suppliers | Companies that supply products |
| 6 | `supplier_products` | Suppliers | Product-supplier association with current cost |
| 7 | `stock_lots` | Inventory | Stock units with expiration date. Single source of truth for stock |
| 8 | `stock_movements` | Inventory | Traceability of every stock change |
| 9 | `orders` | Orders | Unified order entity for POS and ONLINE sales |
| 10 | `order_items` | Orders | Line items within an order, with product snapshots |
| 11 | `payments` | Payments | Unified payment entity for online (MP) and in-store (cash register) |
| 12 | `cash_sessions` | Cash | Cash register sessions (open/close per shift) |
| 13 | `cash_movements` | Cash | Manual cash movements during a session |
| 14 | `audit_logs` | Audit | Audit trail for critical actions |

## Optional

| # | Table | Domain | Purpose |
|---|---|---|---|
| 15 | `product_promotions` | Promotions | Simple per-product discounts (optional for MVP) |

## Post-MVP entities (identified for future)

| Entity | Why deferred |
|---|---|
| `customer_addresses` | Pickup only in MVP. Needed for home delivery |
| `carts`, `cart_items` | Cart is frontend localStorage |
| `branch_product_stock` | stock_lots is sufficient |
| `stock_reservations` | No stock reservation. Revert via cancellation movements |
| `stock_transfers` | Single branch in MVP |
| `brands` | brand_name stored as text |
| `product_images` | Single image_url on product |
| `tags`, `product_tags` | Optional, post-MVP |
| `roles`, `user_roles` | Role stored as direct field |
| `companies` | Single business |
| `coupons` | Post-MVP |

## Key entity details

### Branch
- Physical store location
- Has stock, employees, cash registers
- Prepares online orders for pickup

### User
- `role`: ADMIN, MANAGER, EMPLOYEE, or CUSTOMER
- CUSTOMER: branch_id = null (does not belong to internal branch)
- MANAGER/EMPLOYEE: branch_id required (assigned branch)
- ADMIN: branch_id optional (global access)

### Product
- Global catalog (not per-branch)
- `sale_price`: direct field, history in audit_logs
- `online_status`: DRAFT, PUBLISHED, PAUSED, HIDDEN
- `image_url`: single image (file system, served by Nginx)

### StockLot
- Belongs to a product AND a branch
- `quantity_available`: numeric(12,3) supports fractional products
- `expiration_date`: optional, used for FEFO ordering
- `cost_price`: optional, per-lot cost for COGS reporting

### Order
- `type`: POS or ONLINE
- `fulfillment_type`: PICKUP only in MVP
- ONLINE requires `customer_user_id` (registered CUSTOMER)
- POS requires `created_by_user_id` (internal employee)
- Snapshots: customer_name, customer_email, customer_phone

### Payment
- Unified for online and in-store
- Online (MP): `cash_session_id = null`, `provider = MERCADO_PAGO`
- In-store: `cash_session_id` required, `provider = MANUAL`

### CashSession
- `status`: OPEN or CLOSED
- Only one OPEN session per branch at a time
- Closing compares expected cash vs counted cash
