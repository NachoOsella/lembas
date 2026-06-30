# Integrations

## Mercado Pago Checkout Pro

The only external integration in the MVP.

### Purpose

Process online payments for the e-commerce channel. Customers are redirected to MP's hosted checkout page and return to the store after payment.

### Integration approach

Mercado Pago is integrated directly in the payments module. The MVP does not introduce a separate abstraction because there is only one online payment provider.

This keeps the backend simpler while still keeping the external API calls localized in a small number of service classes.

### Endpoints used

| MP API | Purpose |
|---|---|
| POST /checkout/preferences | Create Checkout Pro preference |
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
| `MP_ACCESS_TOKEN` | Mercado Pago access token (sandbox or production) |
| `MP_WEBHOOK_SECRET` | Secret for webhook signature verification |
| `MP_NOTIFICATION_URL` | Public URL MP POSTs webhook notifications to |
| `MP_SUCCESS_URL` | Redirect URL after successful payment |
| `MP_FAILURE_URL` | Redirect URL after failed payment |
| `MP_PENDING_URL` | Redirect URL for pending payment |

The application always uses the real Mercado Pago SDK gateway. `accessToken`
and `webhookSecret` are mandatory and the application fails fast at boot if
either is blank. The Docker compose stack requires both values via
environment variables, while `application.yml` ships benign placeholders so
unit tests and the offline smoke test can boot without real credentials.

### Local sandbox testing with ngrok

Mercado Pago cannot reach a `localhost` webhook URL, so local sandbox
testing needs a public tunnel. The repo ships an opt-in Docker override
(`docker/mp-sandbox.override.yml`) that adds an `ngrok/ngrok:3` service
on top of the main stack. The override is activated with:

```bash
cd docker
docker compose --env-file .env -f compose.yml -f mp-sandbox.override.yml up -d
docker compose --env-file .env -f compose.yml -f mp-sandbox.override.yml logs ngrok
```

The public URL printed in the ngrok logs (for example
`https://abc123.ngrok-free.app`) is registered in the Mercado Pago panel
as the webhook URL, and the same value is set in `MP_NOTIFICATION_URL` so
the backend can verify webhook signatures. See `docker/README.md` for the
full step-by-step.

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

## Future integrations

When new external integrations are required, implement them in focused service classes first. Introduce an interface only when there are multiple implementations or a clear testing need that cannot be covered with standard mocks.
