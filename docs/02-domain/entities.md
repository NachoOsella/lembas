# Entities

## Entity summary

| # | Table | Domain | Purpose |
|---|---|---|---|
| 1 | `branches` | Core | Physical store locations. MVP has 1, but model supports multiple |
| 2 | `users` | Core | All system users. Role stored as direct field, no roles table |
| 3 | `categories` | Catalog | Product categories, supports parent-child tree |
| 4 | `products` | Catalog | Salable products with current sale price, barcode, and online status |
| 5 | `product_sale_price_history` | Catalog | Dedicated history of product sale price changes |
| 6 | `pricing_rules` | Catalog | Margin rules used to suggest sale prices |
| 7 | `suppliers` | Suppliers | Companies that supply products |
| 8 | `supplier_products` | Suppliers | Product-supplier association with current replacement cost |
| 9 | `supplier_product_cost_history` | Suppliers | Dedicated history of supplier replacement cost changes |
| 10 | `price_update_batches` | Suppliers | Reviewed batch for supplier cost and sale price updates |
| 11 | `price_update_batch_items` | Suppliers | Per-product preview and final values inside a price update batch |
| 12 | `purchase_orders` | Purchasing | Intention to buy products from a supplier; does not affect stock |
| 13 | `purchase_order_items` | Purchasing | Products, quantities, and expected costs in a purchase order |
| 14 | `purchase_receipts` | Purchasing | Real merchandise reception; confirmation increases stock |
| 15 | `purchase_receipt_items` | Purchasing | Received quantities, real costs, lot codes, and expiration dates |
| 16 | `stock_lots` | Inventory | Physical stock lots. Single source of truth for current availability |
| 17 | `stock_movements` | Inventory | Immutable traceability of every stock change |
| 18 | `orders` | Orders | Unified order entity for POS and ONLINE sales |
| 19 | `order_items` | Orders | Line items within an order, with product, price, and cost snapshots |
| 20 | `payments` | Payments | Unified payment entity for online and in-store payments |
| 21 | `cash_sessions` | Cash | Cash register sessions, open/close per shift |
| 22 | `cash_movements` | Cash | Manual cash movements during a session |
| 23 | `audit_logs` | Audit | Audit trail for critical actions |

## Optional

| # | Table | Domain | Purpose |
|---|---|---|---|
| 24 | `product_promotions` | Promotions | Simple per-product discounts |

## Post-MVP entities identified for future

| Entity | Why deferred |
|---|---|
| `customer_addresses` | Pickup only in MVP. Needed for home delivery |
| `carts`, `cart_items` | Cart is frontend localStorage |
| `branch_product_stock` | `stock_lots` is sufficient |
| `stock_reservations` | No stock reservation. Revert via cancellation movements |
| `stock_transfers` | Single branch in MVP, movement types are reserved for future transfers |
| `brands` | `brand_name` is stored as text |
| `product_images` | Single `image_url` on product |
| `tags`, `product_tags` | Optional, post-MVP |
| `roles`, `user_roles` | Role stored as direct field |
| `companies` | Single business |
| `coupons` | Post-MVP |

## Key entity details

### Branch

- Physical store location
- Has stock, employees, and cash registers
- Prepares online orders for pickup

### User

- `role`: ADMIN, MANAGER, EMPLOYEE, or CUSTOMER
- CUSTOMER: `branch_id = null`
- MANAGER/EMPLOYEE: `branch_id` required
- ADMIN: `branch_id` optional

### Product

- Global catalog item, not per branch
- `sale_price` is the current operational sale price used by POS and online store
- Sale price history is stored in `product_sale_price_history`
- `audit_logs` records who changed prices, but it is not the source for commercial price history queries
- `online_status`: DRAFT, PUBLISHED, PAUSED, HIDDEN
- `image_url`: single image, served from the file system through Nginx

### ProductSalePriceHistory

- Stores old and new sale prices with validity dates
- Supports reporting questions such as historical sale price, price variation, and margin at a point in time
- Can reference the source that caused the change: manual update, price batch, purchase receipt suggestion, or correction

### PricingRule

- Defines target margin for suggested sale prices
- Can apply globally, by category, or by product
- Priority: product rule, category rule, default rule

### Supplier

- Company that supplies products
- Owns purchase orders, receipts, product associations, and price update batches

### SupplierProduct

- Connects one product with one supplier
- `current_cost` is the current replacement cost for that product-supplier pair
- Conceptually this means `current_replacement_cost`; the column name can remain `current_cost`
- A product can have multiple suppliers
- `is_preferred` marks the supplier used first for price suggestions

### SupplierProductCostHistory

- Stores old and new replacement costs with validity dates
- Updated when `supplier_products.current_cost` changes from manual edits, receipts, supplier files, purchase orders, or price batches

### PriceUpdateBatch

- Represents a reviewed supplier price and catalog update operation
- Supports one-product manual update, uploaded supplier file, percentage increase, or manual grid
- Can update existing products or create new products from unmatched supplier rows
- Stores global defaults such as target margin and default apply flags
- Does not affect stock or existing lot costs
- Applies only after human confirmation

### PriceUpdateBatchItem

- Represents one preview row from the manual update or supplier list import
- Status can be CREATE, UPDATE, UNCHANGED, REVIEW, EXCLUDED, or ERROR
- Existing and new products use `new_product_margin_percentage` to calculate sale price from replacement cost
- Supplier variation is informational for existing products and does not drive price calculation
- The admin can override final sale price, margin, and apply flags per row

### PurchaseOrder

- Represents the intention to buy from a supplier
- Does not create stock lots or stock movements
- States: DRAFT, CONFIRMED, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED

### PurchaseOrderItem

- Stores ordered product, quantity, expected unit cost, and subtotal
- Unit cost is preloaded from `supplier_products.current_cost` but can be edited
- The expected cost is frozen in the order and is not changed by future supplier cost updates

### PurchaseReceipt

- Represents real merchandise arrival
- Confirmation creates stock lots and `PURCHASE_ENTRY` movements
- Can be linked to a purchase order or created for manual reception if allowed
- States: DRAFT, CONFIRMED, CANCELLED

### PurchaseReceiptItem

- Stores received quantity, real unit cost, expiration date, and lot code
- `unit_cost` becomes the created `stock_lots.unit_cost`
- Can represent extra products not included in the order with `purchase_order_item_id = null`

### StockLot

- Belongs to a product and a branch
- Represents current physical stock for one received lot
- Stores `initial_quantity`, `quantity_available`, and immutable `unit_cost`
- Can reference supplier, supplier product, purchase receipt, and purchase receipt item
- `expiration_date` is optional and used for FEFO ordering

### StockMovement

- Immutable record of each stock change
- References product, branch, lot, quantity, type, optional cost snapshot, reason, source reference, user, and timestamp
- Purchase receipt confirmation creates `PURCHASE_ENTRY`
- POS and online sales create `POS_SALE` or `ONLINE_SALE`
- Cancellation creates `CANCELLATION_RETURN` against the same lots originally deducted

### Order

- `type`: POS or ONLINE
- `fulfillment_type`: PICKUP only in MVP
- ONLINE requires `customer_user_id`
- POS requires `created_by_user_id`
- Stores customer snapshots

### OrderItem

- Stores product name, barcode, unit price, and cost snapshots
- `unit_price` is the sold price frozen at the sale time

### Payment

- Online: `cash_session_id = null`, `provider = MERCADO_PAGO`
- In-store: `cash_session_id` required, `provider = MANUAL` or equivalent terminal/bank provider

### CashSession

- `status`: OPEN or CLOSED
- Only one OPEN session per branch at a time
- Closing compares expected cash against counted cash
