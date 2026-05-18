# Environment Variables

## Template (`.env.example`)

```bash
# ============================================
# Database
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lembas
DB_USER=lembas
DB_PASSWORD=lembas

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET=your-secret-key-at-least-256-bits-long

# ============================================
# Mercado Pago (sandbox for development)
# ============================================
MP_ACCESS_TOKEN=TEST-1234567890-abcdef
MP_WEBHOOK_SECRET=your-webhook-secret
MP_SUCCESS_URL=http://localhost:4200/customer/payment/callback
MP_FAILURE_URL=http://localhost:4200/customer/payment/callback
MP_PENDING_URL=http://localhost:4200/customer/payment/callback

# ============================================
# Application
# ============================================
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
```

## Environment reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `lembas` | Database name |
| `DB_USER` | Yes | `lembas` | Database user |
| `DB_PASSWORD` | Yes | `lembas` | Database password |
| `JWT_SECRET` | Yes | -- | JWT signing key (min 256 bits) |
| `MP_ACCESS_TOKEN` | Yes (prod) | -- | Mercado Pago API token |
| `MP_WEBHOOK_SECRET` | Yes (prod) | -- | Webhook signature secret |
| `MP_SUCCESS_URL` | No | -- | Redirect after successful payment |
| `MP_FAILURE_URL` | No | -- | Redirect after failed payment |
| `MP_PENDING_URL` | No | -- | Redirect for pending payment |
| `SPRING_PROFILES_ACTIVE` | No | `dev` | Active Spring profile |
| `SERVER_PORT` | No | `8080` | Backend HTTP port |

## Profiles reference

| Profile | Database | Payments | When to use |
|---|---|---|---|
| `dev` | Local PostgreSQL | Local Mercado Pago config | Local development |
| `test` | Testcontainers | Mocked Mercado Pago calls | Automated tests |
| `prod` | Production PostgreSQL | Mercado Pago production config | Production deployment |
