# Lembas Docker Compose stack

This directory contains the Docker Compose deployment files for Dietetica Lembas.

## Files

- `compose.yml`: PostgreSQL 16, Spring Boot backend, and Nginx web stack.
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
| `MP_ACCESS_TOKEN` | *(optional)* | Mercado Pago API credentials |
| `MP_WEBHOOK_SECRET` | *(optional)* | Mercado Pago webhook signing secret |
