# Integrations

## Mercado Pago Checkout Pro

The only external integration in the MVP.

### Purpose

Process online payments for the e-commerce channel. Customers are redirected to MP's hosted checkout page and return to the store after payment.

### Integration pattern

Mercado Pago is integrated behind a `PaymentGateway` interface:

```java
interface PaymentGateway {
    Preference createPreference(Order order, Payment payment);
    PaymentStatus checkPayment(String paymentId);
    boolean verifyWebhookSignature(WebhookRequest request);
}
```

This provides:
- Testability via FakePaymentGateway
- Ability to switch or add payment providers without redesigning the payment module
- Clean separation of external API logic from domain logic

### Endpoints used

| MP API | Purpose |
|---|---|
| POST /v1/payments | Create payment preference |
| GET /v1/payments/{id} | Query payment status |
| POST /webhooks | Receive payment notifications |

### Webhook flow

```text
1. MP sends POST to /api/webhooks/mercadopago (with X-Signature header)
2. Backend verifies signature using configured secret
3. Backend queries MP API for real payment status
4. If APPROVED: update payment, deduct FEFO stock, order to PAID
5. If REJECTED: update payment, order to PAYMENT_FAILED
6. Idempotency check prevents duplicate processing of same provider_payment_id
```

### Configuration

| Environment variable | Description |
|---|---|
| MP_ACCESS_TOKEN | Mercado Pago access token (sandbox or production) |
| MP_WEBHOOK_SECRET | Secret for webhook signature verification |
| MP_SUCCESS_URL | Redirect URL after successful payment |
| MP_FAILURE_URL | Redirect URL after failed payment |
| MP_PENDING_URL | Redirect URL for pending payment |

## Image storage

Product images are stored on the local file system and served by Nginx as static files. No external image hosting service is used in MVP.

## No other external integrations in MVP

| Integration | Status |
|---|---|
| Mercado Pago | Integrated (MVP) |
| Email (SMTP) | Post-MVP |
| WhatsApp / SMS | Post-MVP |
| Fiscal invoicing API | Post-MVP |
| Logistics (Rappi, PedidosYa) | Post-MVP |
| Supplier price import | Post-MVP |

## Future integration architecture

When new external integrations are required, they should follow the same adapter pattern:

```text
Domain interface (e.g., ShippingGateway, NotificationService)
    └── Implementation 1 (e.g., ManualShipping)
    └── Implementation 2 (e.g., RappiApiAdapter)
    └── Fake implementation for tests
```
