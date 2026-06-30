# Lembas Docker Compose stack

This directory contains the Docker Compose deployment files for Dietetica Lembas.

## Files

- `compose.yml`: PostgreSQL 16, Spring Boot backend, Nginx web stack, and ngrok tunnel.
- `ngrok.yml`: ngrok tunnel configuration used by the compose stack.
- `backend.Dockerfile`: Java 21 multi-stage backend image with Maven cache and non-root runtime user.
- `frontend.Dockerfile`: Angular production build served by unprivileged Nginx.
- `nginx.conf`: Reverse proxy for `/api`, Swagger/OpenAPI, uploads, and Angular routes.
- `.env.example`: Environment variable template.

## Usage (full stack)

```bash
cd docker
cp .env.example .env
# Edit .env before running in production.
docker compose --env-file .env up -d --build
```

## Useful commands

```bash
# View logs from all services
docker compose --env-file .env logs -f

# Follow a specific service
docker compose --env-file .env logs -f backend

# Stop services (keeps volumes)
docker compose --env-file .env down

# Stop services and delete the database volume (data loss!)
docker compose --env-file .env down -v

# Start only the database (useful for local backend development)
docker compose --env-file .env up -d db

# Rebuild a single service without cache
docker compose --env-file .env build --no-cache backend

# Create a database backup
docker compose --env-file .env exec db pg_dump -U lembas lembas > backup.sql

# Restore a database backup
docker compose --env-file .env exec -T db psql -U lembas lembas < backup.sql
```

## Mercado Pago sandbox testing (ngrok tunnel)

The stack runs on `localhost`, which is not reachable from Mercado Pago's
servers. The compose stack includes an ngrok container that tunnels the
web container (and the backend via nginx) to a public
`https://<random>.ngrok-free.app` URL.

The ngrok container starts automatically with the stack but only opens a
tunnel when `NGROK_AUTHTOKEN` is set in `.env`. If left empty, the container
prints a reminder and pauses harmlessly.

### One-time setup

1. Create a free ngrok account: <https://dashboard.ngrok.com/signup>.
2. Copy your authtoken from <https://dashboard.ngrok.com/get-started/your-authtoken>.
3. In `docker/.env` set:
   ```bash
   NGROK_AUTHTOKEN=<your-authtoken>
   MP_ACCESS_TOKEN=TEST-...   # from the Mercado Pago Developers panel, "Pruebas" tab
   MP_WEBHOOK_SECRET=<a-strong-shared-secret>
   MP_NOTIFICATION_URL=http://placeholder.invalid/api/webhooks/mercadopago  # replaced after ngrok starts
   ```

### Start the stack

```bash
cd docker
docker compose --env-file .env up -d --build
```

The `ngrok` container is marked as unhealthy until it has a live tunnel.
Get the public URL from its logs:

```bash
docker compose --env-file .env logs ngrok
# Look for a line like:
#   msg="started tunnel" object-url="https://abc123.ngrok-free.app"
```

You can also browse <http://localhost:4040> for the ngrok web inspection
UI (the request log is helpful when debugging webhook signatures).

### Wire the URL back into Mercado Pago

1. Copy the public URL printed by ngrok (e.g. `https://abc123.ngrok-free.app`).
2. In the Mercado Pago Developers panel, register the webhook with the same
   `MP_WEBHOOK_SECRET` you set above, pointing at:
   ```
   https://abc123.ngrok-free.app/api/webhooks/mercadopago
   ```
3. Update `MP_NOTIFICATION_URL` in `docker/.env` to the same value, then
   restart the backend:
   ```bash
   docker compose --env-file .env up -d --force-recreate backend
   ```
4. Use the test card numbers from the Mercado Pago panel to drive a
   checkout end-to-end.

## Database migrations (Flyway)

Migrations run automatically when the backend starts. For manual control:

```bash
# Inside the backend directory
cd backend

# Apply pending migrations
./mvnw flyway:migrate

# Check migration status
./mvnw flyway:info

# Repair migration checksums after manual SQL edits
./mvnw flyway:repair

# Clean (drop all) and re-apply all migrations -- DESTRUCTIVE
./mvnw flyway:clean flyway:migrate
```

Migrations live in `backend/src/main/resources/db/migration/` and follow Flyway
versioned naming: `V1__description.sql`, `V2__description.sql`, etc.
Seed data is the last migration (`V10__seed_data.sql`).

## Reset local development database

Use the convenience script at the project root:

```bash
# Full reset: destroy volume, re-create DB, apply all migrations
./scripts/reset-db.sh

# Only re-run seed data (preserves schema and existing data)
./scripts/reset-db.sh --seed-only

# Only re-run migrations (drops and re-creates all tables)
./scripts/reset-db.sh --migrate-only
```

The reset script:
1. Stops the database container and removes its volume (`down -v`)
2. Starts only the `db` service
3. Waits for PostgreSQL health check
4. Runs Flyway migrations automatically

## Frontend development with Docker database

When developing the frontend locally (outside Docker), you only need the database
running. From the `frontend/` directory:

```bash
cd frontend

# Start only PostgreSQL
npm run docker:up

# Run the Angular dev server (proxies /api to localhost:8080)
npm start

# When done, stop the database
npm run docker:down
```

## URLs

| Service | URL |
|---|---|
| Web app (production) | `http://localhost` or `http://localhost:${WEB_PORT}` |
| Backend API through Nginx | `http://localhost/api` |
| Backend API direct | `http://localhost:8080` (only in dev mode) |
| Swagger UI | `http://localhost/swagger-ui.html` |
| Swagger docs (JSON) | `http://localhost/api-docs` |
| Actuator health | `http://localhost/actuator/health` |
| PostgreSQL (external) | `localhost:${DB_PORT}` (bound to 127.0.0.1 by default) |

> The `DB_BIND_ADDRESS=127.0.0.1` setting in `.env` ensures PostgreSQL is only
> accessible from the host machine, not from other network hosts.

## Environment variables

The `.env` file at `docker/.env` controls all configuration. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DB_NAME` | `lembas` | PostgreSQL database name |
| `DB_USER` | `lembas` | PostgreSQL user |
| `DB_PASSWORD` | *(required)* | PostgreSQL password (strongly recommended to change) |
| `DB_PORT` | `5432` | PostgreSQL host port |
| `DB_BIND_ADDRESS` | `127.0.0.1` | Interface PostgreSQL listens on |
| `JWT_SECRET` | *(required)* | 256-bit+ secret for JWT signing |
| `SPRING_PROFILES_ACTIVE` | `prod` | Active Spring profile |
| `WEB_PORT` | `80` | Public HTTP port |
| `MP_ACCESS_TOKEN` | *(required)* | Mercado Pago access token (sandbox or production) |
| `MP_WEBHOOK_SECRET` | *(required)* | Shared secret used to verify Mercado Pago webhook signatures |
| `MP_NOTIFICATION_URL` | `http://localhost:8080/api/webhooks/mercadopago` | Public URL MP POSTs to |
| `MP_SUCCESS_URL` / `MP_FAILURE_URL` / `MP_PENDING_URL` | `http://localhost/customer/payment/callback` | Customer redirect targets |
| `NGROK_AUTHTOKEN` | *(blank)* | ngrok authtoken. Leave blank to skip the tunnel; set to enable Mercado Pago sandbox testing |
| `NGROK_WEB_PORT` | `4040` | Local port for the ngrok inspection UI |
