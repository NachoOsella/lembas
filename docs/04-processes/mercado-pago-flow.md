# Process: Mercado Pago Integration

## Overview

Mercado Pago Checkout Pro processes online payments for the store. The integration is kept in the payments module to avoid unnecessary abstraction in the MVP.

## Integration architecture

```text
Customer's browser
    ↓ (redirect)
Mercado Pago Checkout Pro (hosted payment page)
    ↓ (webhook + redirect)
Backend Spring Boot
    └── MercadoPagoService
    └── MercadoPagoWebhookController
```

## Full checkout flow

```text
1. Customer creates order → POST /api/customer/orders
   └── Backend creates order (PENDING_PAYMENT) + payment (PENDING)

2. Customer requests checkout → POST /api/customer/orders/{id}/checkout/mp
   └── Backend creates a Mercado Pago preference
   └── MP returns { initPoint, preferenceId }
   └── Backend saves provider_preference_id in payment
   └── Returns { initPoint } to frontend

3. Frontend redirects customer to MP Checkout Pro (window.location.href = initPoint)

4. Customer completes payment in MP's hosted page

5. MP redirects customer back to frontend (success/failure/pending page)

6. Frontend polls GET /api/customer/orders/{id} to check updated status

7. MP sends webhook → POST /api/webhooks/mercadopago
   └── Backend verifies webhook signature
   └── Backend queries MP API for real payment status
   └── If APPROVED:
       └── @Transactional
       └── UPDATE payment (APPROVED, approved_at)
       └── SELECT stock_lots FOR UPDATE (FEFO order)
       └── UPDATE stock_lots (deduct)
       └── INSERT stock_movement (ONLINE_SALE)
       └── UPDATE order (PAID, paid_at)
   └── If REJECTED:
       └── UPDATE payment (REJECTED)
       └── UPDATE order (PAYMENT_FAILED)
```

## Idempotency

The webhook processor is idempotent:

```text
1. Extract provider_payment_id from the notification
2. Query payment by provider_payment_id
3. If payment already has status APPROVED or REJECTED:
     → Return 200 OK (already processed)
4. If payment is PENDING:
     → Query MP API for real status
     → Process only if real status is different
```

This prevents double-deduction of stock if MP sends duplicate webhooks.

## Webhook security

1. The webhook endpoint is public (no JWT required)
2. Signature verification uses `X-Signature` header and a configured secret
3. The backend never trusts the webhook body alone -- it always queries the real status from MP API
4. Rate limiting is not applied to this endpoint because MP needs to deliver notifications reliably

## Test strategy

| Test | What it verifies |
|---|---|
| Preference creation | Correct mapping of order items to MP request format |
| Webhook approved | Full transactional flow: payment update, FEFO deduction, order status change |
| Webhook duplicate | Idempotency: second same notification returns 200 without side effects |
| Webhook rejected | Payment and order go to rejected/failed state |
| Stock conflict | Payment approved but insufficient stock → STOCK_CONFLICT |

## Configuration

| Variable | Description |
|---|---|
| MP_ACCESS_TOKEN | Mercado Pago API access token |
| MP_WEBHOOK_SECRET | Secret for webhook X-Signature verification |
| MP_SUCCESS_URL | Redirect URL after successful payment |
| MP_FAILURE_URL | Redirect URL after failed payment |
| MP_PENDING_URL | Redirect URL for pending payment |
