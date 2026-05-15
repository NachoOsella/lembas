# Process: Cash Opening and Closing

## Cash register lifecycle

```text
OPEN → (sales + movements) → CLOSE
```

## Opening flow

```mermaid
sequenceDiagram
    actor E as Employee
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    E->>FE: Enter initial cash amount
    FE->>BE: POST /api/admin/cash-sessions/open
    BE->>DB: SELECT FOR UPDATE (check for open session)
    BE->>DB: INSERT cash_session (status=OPEN, openingCashAmount, openedBy)
    BE-->>FE: Session opened with details
```

### Opening rules

- Any authorized employee (ADMIN, MANAGER, EMPLOYEE) can open
- Only one OPEN session per branch at a time
- Required: openingCashAmount (>= 0)
- Optional: openingNotes

## Manual movements during session

```mermaid
sequenceDiagram
    actor E as Employee
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    E->>FE: Select type, method, enter amount and reason
    FE->>BE: POST /api/admin/cash-sessions/{id}/movements
    BE->>DB: Verify session is OPEN
    BE->>DB: INSERT cash_movement
    BE-->>FE: Movement recorded
```

### Movement types

| Type | Description |
|---|---|
| CASH_IN | Cash entering the drawer |
| CASH_OUT | Cash leaving the drawer |
| ADJUSTMENT | Correction without physical movement |

### Movement rules

- Session must be OPEN
- Reason is mandatory
- Amount must be != 0
- Movement is associated with the creating user

## Closing flow

```mermaid
sequenceDiagram
    actor E as Employee
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL

    E->>FE: Request close summary
    FE->>BE: GET /api/admin/cash-sessions/{id}
    BE-->>FE: Totals by method, expected cash
    E->>FE: Enter counted cash amount
    Note over E,FE: If difference != 0, reason is required
    E->>FE: Confirm close
    FE->>BE: POST /api/admin/cash-sessions/{id}/close
    BE->>BE: Calculate expectedCashAmount
    BE->>DB: UPDATE session (status=CLOSED, counted, difference, reason, closedBy)
    BE-->>FE: Session closed with full detail
```

### Close calculation

```text
expectedCashAmount = openingCashAmount
                   + SUM(cash payments)
                   + SUM(cash_in movements)
                   - SUM(cash_out movements)

cashDifference = countedCashAmount - expectedCashAmount
```

### Close rules

- Any authorized employee can close, even if not the same person who opened
- If cashDifference != 0, cash_difference_reason is mandatory
- The session closes regardless of the discrepancy
- After closing, no more operations can be added
- Both opened_by and closed_by users are recorded

### Close report

The closing report shows:

```
Opening cash amount:     $X
Expected cash:           $Y
Counted cash:            $Z
Difference:              $Z - $Y
Difference reason:       (if applicable)

Totals by payment method:
  CASH:          $A  (affects expected cash)
  QR:            $B  (informational)
  TRANSFER:      $C  (informational)
  DEBIT_CARD:    $D  (informational)
  CREDIT_CARD:   $E  (informational)

Manual movements:
  CASH_IN:       $F
  CASH_OUT:      $G
  ADJUSTMENTS:   $H
```
