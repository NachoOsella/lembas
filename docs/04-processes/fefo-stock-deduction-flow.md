# Process: Stock Reservation (FEFO Deduction)

> There is no stock reservation in the MVP. Stock is deducted only when payment is confirmed.

## Flow

```mermaid
sequenceDiagram
    participant BE as Backend
    participant DB as PostgreSQL

    Note over BE,DB: ONLINE: MP WEBHOOK APPROVED
    BE->>BE: @Transactional
    BE->>DB: SELECT stock_lots FOR UPDATE (FEFO order)
    BE->>BE: Calculate lots to deduct
    BE->>DB: UPDATE stock_lots SET quantity_available -= ?
    BE->>DB: INSERT stock_movement (type=ONLINE_SALE)
    BE->>DB: UPDATE payment (status=APPROVED)
    BE->>DB: UPDATE order (status=PAID)

    Note over BE,DB: POS: AT TIME OF SALE
    BE->>BE: @Transactional
    BE->>DB: SELECT stock_lots FOR UPDATE (FEFO order)
    BE->>DB: UPDATE stock_lots SET quantity_available -= ?
    BE->>DB: INSERT stock_movement (type=POS_SALE)
    BE->>DB: INSERT payment (status=APPROVED, cash_session_id)
    BE->>DB: INSERT order (type=POS, status=PAID)

    Note over BE,DB: HANDOVER to customer at branch (DELIVERED = pickup, NOT home delivery)
    BE->>DB: UPDATE order SET status=DELIVERED

    Note over BE,DB: CANCELLATION (reverses)
    BE->>DB: UPDATE stock_lots SET quantity_available += ?
    BE->>DB: INSERT stock_movement (type=CANCELLATION_RETURN)
    BE->>DB: UPDATE payment (status=CANCELLED)
    BE->>DB: UPDATE order (status=CANCELLED)
```

## Stock state example

| Moment | Lot A | Lot B | Total |
|---|---|---|---|
| Before order | 10 | 5 | 15 |
| Payment approved (deduct 3 from A) | 7 | 5 | 12 |
| Delivered | 7 | 5 | 12 |
| Cancelled (reversed to A) | 10 | 5 | 15 |

## Rules

| Rule | Description |
|---|---|
| Stock deducted on payment approval | Not at order creation, not at delivery |
| FEFO ordering | Lot expiring first is deducted first |
| Cancellation reverses to the same lots | Uses original stock_movements as reference |
| If payment approved but no stock | Order goes to STOCK_CONFLICT, manual review |
