# Stock Rules

## Source of truth

Available stock is calculated as:

```sql
available = SUM(stock_lots.quantity_available)
WHERE product_id = ? AND branch_id = ? AND status = 'ACTIVE'
```

There is no denormalized stock cache. `stock_lots` is the single source of truth for current physical stock, and `stock_movements` is the immutable history of every stock change.

## Lots

Each stock lot represents physical merchandise received at a branch. A lot stores the real unit cost at reception time and is not modified by future supplier price changes.

| Field | Required | Notes |
|---|---|---|
| product_id | Yes | References the product |
| branch_id | Yes | References the branch |
| supplier_id | No | Supplier that delivered the merchandise, when known |
| supplier_product_id | No | Product-supplier relation used for the purchase, when known |
| purchase_receipt_id | No | Purchase receipt that created the lot |
| purchase_receipt_item_id | No | Exact receipt item that created the lot |
| lot_code | No | Supplier or internal lot code |
| expiration_date | No | Used for FEFO ordering |
| initial_quantity | Yes | Quantity originally received in the lot, numeric(12,3), > 0 |
| quantity_available | Yes | Current available quantity, numeric(12,3), >= 0 |
| unit_cost | Yes | Real received unit cost, frozen for COGS and margin analysis |
| status | Yes | ACTIVE, DEPLETED, or CANCELLED |

## Stock entry

Stock increases only when a purchase receipt is confirmed.

1. A purchase order defines the expected products and costs, but it does not touch stock.
2. A purchase receipt records the real merchandise received.
3. Each confirmed receipt item creates one stock lot.
4. Each created lot generates a `PURCHASE_ENTRY` stock movement.
5. The lot `unit_cost` is copied from the receipt item and remains immutable.
6. Existing lots are never updated by supplier cost changes or mass price updates.

## Purchase orders and receipts

| Concept | Affects stock? | Purpose |
|---|---:|---|
| Purchase order | No | Intention to buy from a supplier |
| Purchase receipt | Yes, when confirmed | Actual arrival of merchandise |
| Price update batch | No | Updates replacement costs and sale prices after review |

A partially received order can remain open for later receipts or be closed with missing quantities according to business permissions.

## FEFO (First Expired, First Out)

When deducting stock:

1. Lots are ordered by expiration_date ascending (NULLS LAST)
2. Lots without expiration dates are consumed after all dated lots
3. Deduction may span multiple lots to satisfy the required quantity
4. If total available stock is insufficient, the operation fails with INSUFFICIENT_STOCK

The FEFO deduction logic lives in the inventory service and is covered by unit tests.

## Stock movement types

| Type | Description | quantity sign |
|---|---|---|
| PURCHASE_ENTRY | New stock arriving from a confirmed purchase receipt | Positive |
| POS_SALE | In-store sale | Negative |
| ONLINE_SALE | Online sale confirmed via payment | Negative |
| CANCELLATION_RETURN | Reversal from cancelled order | Positive |
| MANUAL_ADJUSTMENT | Manual inventory correction | Positive or negative |
| WASTE | Spoiled or damaged product | Negative |
| INTERNAL_CONSUMPTION | Product used internally | Negative |
| TRANSFER_OUT | Future branch transfer output | Negative |
| TRANSFER_IN | Future branch transfer input | Positive |

Each movement stores enough context to trace the cause of the change: product, branch, lot, quantity, optional `unit_cost_snapshot`, reason, reference type/id, user, and timestamp.

## Deduction timing

| Channel | When stock is deducted |
|---|---|
| Online | When Mercado Pago webhook confirms APPROVED payment |
| In-store (POS) | At time of sale, in the same transaction as payment |

Stock is NOT deducted at order creation or at delivery.

## Concurrency

Stock deduction uses pessimistic locking:

```sql
SELECT id, quantity_available
FROM stock_lots
WHERE product_id = ? AND branch_id = ? AND quantity_available > 0 AND status = 'ACTIVE'
ORDER BY expiration_date ASC NULLS LAST, id ASC
FOR UPDATE
```

This prevents overselling when POS and webhook transactions occur concurrently.

## Stock conflict

If a payment is approved but stock is insufficient at that moment:

- The order goes to STOCK_CONFLICT status
- No stock is deducted
- Manual review is required
- The payment remains APPROVED because it was already confirmed by Mercado Pago

## Reversal

When an order is cancelled:

1. Look up the original stock_movements for that order
2. Restore stock to the same lots that were deducted
3. Create a new stock_movement with type = CANCELLATION_RETURN
4. This ensures lot traceability is maintained

## Cost and price separation

| Concept | Storage | Rule |
|---|---|---|
| Current sale price | `products.sale_price` | Used by POS and online store |
| Sale price history | `product_sale_price_history` | Dedicated history for price analysis |
| Current replacement cost | `supplier_products.current_cost` | Last known cost for product-supplier pair |
| Replacement cost history | `supplier_product_cost_history` | Dedicated history for supplier cost changes |
| Real lot unit cost | `stock_lots.unit_cost` | Frozen at reception time |
| Sold unit price | `order_items.unit_price` | Frozen at sale time |

Dedicated history tables (`product_sale_price_history`, `supplier_product_cost_history`) are the source for commercial price history queries. A dedicated `audit_logs` table is planned for the post-MVP phase.
