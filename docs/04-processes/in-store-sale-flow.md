# Process: In-Store Sale (POS)

## Flow

```mermaid
sequenceDiagram
    actor E as Employee
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    Note over E,DB: 1. OPEN CASH REGISTER
    E->>FE: Enter initial cash amount
    FE->>BE: POST /api/admin/cash-sessions/open
    BE->>DB: Check no other open session
    BE->>DB: INSERT cash_session (status=OPEN, openingCashAmount)
    BE-->>FE: Cash register opened

    Note over E,DB: 2. BUILD SALE
    E->>FE: Scan/search products
    FE->>BE: GET /api/store/products?barcode=...
    BE-->>FE: Product with price and stock
    FE->>FE: Build ticket (add items, modify quantities)

    Note over E,DB: 3. CHARGE
    C-->>E: Customer pays with selected method
    E->>FE: Select payment method, confirm sale
    FE->>BE: POST /api/admin/pos/sales
    BE->>BE: @Transactional
    BE->>DB: Validate open cash register
    BE->>DB: Validate stock (FOR UPDATE)
    BE->>DB: UPDATE stock_lots (deduct FEFO)
    BE->>DB: INSERT stock_movement (type=POS_SALE)
    BE->>DB: INSERT order (type=POS, status=PAID)
    BE->>DB: INSERT order_items (snapshots)
    BE->>DB: INSERT payment (cash_session_id, provider=MANUAL, method=selected, status=APPROVED)
    BE-->>FE: Sale completed

    Note over E,DB: 4. CLOSE CASH REGISTER
    E->>FE: Request close
    FE->>BE: GET /api/admin/cash-sessions/current (view summary)
    BE-->>FE: Totals by payment method, expected cash
    E->>FE: Enter counted cash, explain discrepancy if needed
    FE->>BE: POST /api/admin/cash-sessions/{id}/close
    BE->>BE: Calculate expectedCashAmount
    BE->>DB: Check for discrepancy
    BE->>DB: UPDATE cash_session (status=CLOSED, counted, difference, reason)
    BE-->>FE: Register closed with full detail
```

## Cash close calculation

```text
expectedCashAmount = openingCashAmount
                   + SUM(payments WHERE method=CASH AND status=APPROVED)
                   + SUM(cash_movements WHERE type=CASH_IN AND method=CASH)
                   - SUM(cash_movements WHERE type=CASH_OUT AND method=CASH)

cashDifference = countedCashAmount - expectedCashAmount

If cashDifference != 0:
  → cash_difference_reason is MANDATORY
  → The register closes anyway, the discrepancy is logged
```

## Informational totals at close

| Method | Affects expected cash? |
|---|---|
| CASH | Yes |
| QR | No (informational) |
| TRANSFER | No (informational) |
| DEBIT_CARD | No (informational) |
| CREDIT_CARD | No (informational) |
