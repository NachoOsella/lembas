# MVP -- Minimum Viable Product

## Success criteria

The MVP is considered complete when the following end-to-end flow works:

```
CUSTOMER:
  Register and login
    ↓
  Browse catalog, add to local cart
    ↓
  Confirm purchase → order ONLINE with PENDING_PAYMENT
    ↓
  Pay with Mercado Pago Checkout Pro
    ↓
  Receive confirmation → stock deducted via FEFO
    ↓
  Track order status: PAID → PREPARING → READY → DELIVERED

EMPLOYEE:
  Open cash register with initial cash amount
    ↓
  Sell via POS with barcode scanning and multiple payment methods
    ↓
  Record manual cash movements
    ↓
  Prepare online orders, mark ready and hand over
    ↓
  Close cash register comparing expected vs counted cash

ADMIN:
  Manage products, stock by lots, suppliers and costs
    ↓
  View daily operational dashboard
    ↓
  Review cash closure reports
    ↓
  View rule-based recommendations
    ↓
  Cancel orders with stock reversal
```

## What must be delivered

1. A working system where a customer can complete an online purchase from catalog to pickup
2. A working POS where an employee can sell in-store with proper cash register management
3. FEFO-compliant stock management with lot tracking
4. Unified payments (Mercado Pago for online, manual for in-store)
5. Basic operational reports

## The 4-sprint plan

| Sprint | Goal | Story points |
|---|---|---:|
| Sprint 1 | Technical foundation, auth, catalog, public store | 75 |
| Sprint 2 | Stock by lots, online orders, local cart, suppliers, payment base | 75 |
| Sprint 3 | Mercado Pago, webhook, FEFO online, cash register, POS | 75 |
| Sprint 4 | Order states, cancellations, reports, audit, security, deployment | 75 |

## Key constraints

- Pickup is the only fulfillment method (no delivery)
- Online purchases require a registered CUSTOMER account
- Stock is deducted when payment is confirmed, not when order is created
- No guest checkout
- No fiscal invoicing
- No mobile native app
