# Cash Register Rules

## Purpose

The cash register module manages the physical cash at each branch. It is designed to match how small retail stores actually work: the main control is over physical cash, while other payment methods (QR, transfer, cards) are tracked but do not require physical counting at close.

## Cash session lifecycle

```
OPEN → (sales, movements) → CLOSE
```

## Opening

Any authorized employee can open a cash register.

Required fields:
- branch_id (derived from the employee's assigned branch)
- opened_by_user_id (the employee)
- opening_cash_amount (declared initial cash in the drawer)
- opening_notes (optional)

Rules:
- Only one OPEN session per branch at a time
- If a session is already open, the open request is rejected (CASH_SESSION_ALREADY_OPEN)

## Manual movements

During a cash session, employees can register manual movements.

| Type | Description | Examples |
|---|---|---|
| CASH_IN | Cash entering the drawer | Payment for an external expense, cash from other source |
| CASH_OUT | Cash leaving the drawer | Paying a supplier, taking cash to bank |
| ADJUSTMENT | Correction without physical movement | Error correction, rounding |

Rules:
- reason is mandatory for all movements
- amount must be != 0
- movements are only allowed if the session is OPEN

## Closing

### Data collected at close

The employee inputs:
- countedCashAmount (physical cash counted in the drawer)
- closingNotes (optional)
- cashDifferenceReason (mandatory if there is a discrepancy)

### Expected cash calculation

```
expectedCashAmount = openingCashAmount
                   + SUM(payments WHERE method=CASH AND status=APPROVED)
                   + SUM(cash_movements WHERE type=CASH_IN AND method=CASH)
                   - SUM(cash_movements WHERE type=CASH_OUT AND method=CASH)
```

### Difference handling

```
cashDifference = countedCashAmount - expectedCashAmount
```

- If cashDifference == 0: session closes normally
- If cashDifference != 0: cash_difference_reason is MANDATORY
- The session closes regardless (the discrepancy is logged and audited)

### Informational totals at close

The close report shows totals by payment method:

| Method | Affects expected cash? |
|---|---|
| CASH | Yes |
| QR | No (informational) |
| TRANSFER | No (informational) |
| DEBIT_CARD | No (informational) |
| CREDIT_CARD | No (informational) |

This distinction is important because only cash is physically counted at close. Other methods are tracked for reporting but do not affect the cash drawer balance.

### Closing rules

- Any authorized employee can close a session, even if they did not open it
- If the closer is different from the opener, both users are recorded
- A session cannot be closed twice
- After closing, no more sales or movements can be added to that session

## Auditing

The following cash events are audited:
- Session opening
- Each manual movement
- Session closing (including counted cash and discrepancy)
