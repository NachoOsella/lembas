# Stock Rules

## Source of truth

Available stock is calculated as:

```
available = SUM(stock_lots.quantity_available)
WHERE product_id = ? AND branch_id = ?
```

There is no denormalized stock cache. `stock_lots` is the single source of truth.

## Lots

Each stock lot must have:

| Field | Required | Notes |
|---|---|---|
| product_id | Yes | References the product |
| branch_id | Yes | References the branch |
| quantity_available | Yes | numeric(12,3), >= 0 |
| lot_code | No | Supplier lot code |
| expiration_date | No | Used for FEFO ordering |
| cost_price | No | Per-lot cost for COGS |

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
| PURCHASE_ENTRY | New stock arriving from supplier | Positive |
| POS_SALE | In-store sale | Negative |
| ONLINE_SALE | Online sale confirmed via payment | Negative |
| CANCELLATION_RETURN | Reversal from cancelled order | Positive |
| MANUAL_ADJUSTMENT | Manual inventory correction | Positive or negative |
| WASTE | Spoiled or damaged product | Negative |
| INTERNAL_CONSUMPTION | Product used internally | Negative |

## Deduction timing

| Channel | When stock is deducted |
|---|---|
| Online | When Mercado Pago webhook confirms APPROVED payment |
| In-store (POS) | At time of sale (same transaction as payment) |

Stock is NOT deducted at order creation or at delivery.

## Concurrency

Stock deduction uses pessimistic locking:

```sql
SELECT id, quantity_available
FROM stock_lots
WHERE product_id = ? AND branch_id = ?
ORDER BY expiration_date ASC
FOR UPDATE
```

This prevents overselling when POS and webhook transactions occur concurrently.

## Stock conflict

If a payment is approved but stock is insufficient at that moment:

- The order goes to STOCK_CONFLICT status
- No stock is deducted
- Manual review is required
- The payment remains APPROVED (already confirmed by MP)

## Reversal

When an order is cancelled:

1. Look up the original stock_movements for that order
2. Restore stock to the same lots that were deducted
3. Create a new stock_movement with type = CANCELLATION_RETURN
4. This ensures lot traceability is maintained
