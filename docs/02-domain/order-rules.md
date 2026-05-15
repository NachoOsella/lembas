# Order Rules

## Order channels

An order can come from one of two channels:

| Channel | type value | Created by | Payment |
|---|---|---|---|
| Online store | ONLINE | CUSTOMER (customer_user_id) | Mercado Pago |
| In-store POS | POS | EMPLOYEE (created_by_user_id) | Manual, associated with cash register |

## Order statuses (ONLINE)

```
PENDING_PAYMENT → PAID → PREPARING → READY → DELIVERED
                → PAYMENT_FAILED
                → CANCELLED
PAID → STOCK_CONFLICT
PAID → CANCELLED
PREPARING → CANCELLED
READY → CANCELLED
STOCK_CONFLICT → PAID (manual stock resolution)
STOCK_CONFLICT → CANCELLED
PAYMENT_FAILED → PENDING_PAYMENT (retry)
```

## Order statuses (POS)

POS orders are created directly as PAID since the sale is completed at the time of payment.

```
PAID → CANCELLED
```

## Status descriptions

| Status | Description | Applies to |
|---|---|---|
| PENDING_PAYMENT | Created, waiting for MP payment | ONLINE |
| PAID | Payment confirmed (online) or sale completed (POS) | ONLINE / POS |
| PREPARING | Employee is gathering products | ONLINE |
| READY | Ready for pickup | ONLINE |
| DELIVERED | Handed to customer at branch (in-store pickup). NOT home delivery. | ONLINE |
| CANCELLED | Cancelled | ONLINE / POS |
| PAYMENT_FAILED | Payment rejected by MP | ONLINE |
| STOCK_CONFLICT | Payment approved but insufficient stock | ONLINE |

## Fulfillment

- MVP only supports PICKUP (pickup at branch)
- `fulfillment_type` field exists in orders table, currently restricted to `PICKUP`
- Future: DELIVERY can be added by extending the CHECK constraint

## Item snapshots

Every order item stores a snapshot of the product at the time of sale:

- product_name_snapshot
- product_barcode_snapshot
- unit_price
- cost_price_snapshot (when available)

This ensures accurate historical reports even if product data changes later.

## Cancellation rules

| Current status | Cancellable? | Stock action | Payment action |
|---|---|---|---|
| PENDING_PAYMENT | Yes | No stock deducted | CANCELLED |
| PAID | Yes | Reverse stock | CANCELLED |
| PREPARING | Yes | Reverse stock | CANCELLED |
| READY | Yes (admin) | Reverse stock | CANCELLED |
| DELIVERED | No | -- | -- |
| CANCELLED | No | -- | -- |
| STOCK_CONFLICT | Yes | No stock deducted | CANCELLED |
| PAYMENT_FAILED | Yes | No stock deducted | CANCELLED |
