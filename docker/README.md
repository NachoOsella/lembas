# Lembas Docker Compose stack

This directory contains the Docker Compose deployment files for Dietetica Lembas.

## Files

- `compose.yml`: PostgreSQL 16, Spring Boot backend, and Nginx web stack.
- `backend.Dockerfile`: Java 21 multi-stage backend image with Maven cache and non-root runtime user.
- `frontend.Dockerfile`: Angular production build served by unprivileged Nginx.
- `nginx.conf`: Reverse proxy for `/api`, Swagger/OpenAPI, uploads, and Angular routes.
- `.env.example`: Environment variable template.

## Usage

```bash
cd docker
cp .env.example .env
# Edit .env before running in production.
docker compose --env-file .env up -d --build
```

## Useful commands

```bash
# View logs
docker compose --env-file .env logs -f

# Stop services
docker compose --env-file .env down

# Reset the database volume
docker compose --env-file .env down -v

# Create a database backup
docker compose --env-file .env exec db pg_dump -U lembas lembas > backup.sql
```

## URLs

- Web app: `http://localhost` or `http://localhost:${WEB_PORT}`
- Backend API through Nginx: `http://localhost/api`
- Swagger UI: `http://localhost/swagger-ui.html`
- PostgreSQL: `localhost:${DB_PORT}` by default because `DB_BIND_ADDRESS=127.0.0.1`
