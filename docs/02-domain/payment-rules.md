# Payment Rules

## Principle

All payments are recorded in the single `payments` entity, regardless of channel (online or in-store).

## Payment providers

| Provider | Used for |
|---|---|
| MERCADO_PAGO | Online purchases via Checkout Pro |
| MANUAL | In-store sales (cash, QR, transfer, cards) |
| BANK | Future: bank transfers/deposits |
| CARD_TERMINAL | Future: physical POS terminal integration |

## Payment methods

| Method | Description |
|---|---|
| CHECKOUT_PRO | Mercado Pago hosted checkout |
| CASH | Physical cash |
| QR | QR code payment (Mercado Pago or other) |
| TRANSFER | Bank transfer |
| DEBIT_CARD | Debit card |
| CREDIT_CARD | Credit card |
| OTHER | Other methods |

## Payment statuses

| Status | Description |
|---|---|
| PENDING | Created, awaiting confirmation |
| APPROVED | Confirmed |
| REJECTED | Rejected by provider |
| CANCELLED | Cancelled |
| REFUNDED | Refunded |
| EXPIRED | Expired without completion |
| IN_PROCESS | In process (MP intermediate state) |

## Rules by channel

### Online (Mercado Pago)

- provider = MERCADO_PAGO
- method = CHECKOUT_PRO
- cash_session_id = null
- Created at order creation (PENDING)
- Approved via webhook from MP
- Idempotency key: provider_payment_id

### In-store (POS)

- provider = MANUAL
- method = selected payment method (CASH, QR, etc.)
- cash_session_id = required (must reference an OPEN cash session)
- Created at time of sale (APPROVED immediately)

## Mercado Pago integration

### Flow

```
1. Customer creates order (POST /api/customer/orders)
2. Customer requests checkout (POST /api/customer/orders/{id}/payments/preference)
3. Backend creates preference in MP from the payment service
4. Backend saves provider_preference_id in payment
5. Backend returns init_point to frontend
6. Frontend redirects to MP Checkout Pro
7. Customer pays in MP
8. MP redirects to frontend (result)
9. MP sends webhook to POST /api/webhooks/mercadopago
10. Backend verifies signature and queries real payment status in MP
11. If APPROVED: update payment, deduct FEFO stock, order to PAID
12. Idempotency: same provider_payment_id is not processed twice
```

### Webhook idempotency

The webhook handler must:
1. Verify the webhook signature
2. Query the real payment status from MP (never trust the webhook body alone)
3. Check if provider_payment_id has already been processed
4. If yes, return 200 OK without any side effects
5. If no, process the payment update atomically

### Implementation note

Mercado Pago API calls and webhook handling live in the payments module. If the project later needs multiple payment providers, an interface can be introduced at that time.
