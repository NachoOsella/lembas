# Docker

## Overview

The Docker Compose stack lives in `docker/` and consists of:

| Service | Image | Purpose |
|---|---|---|
| `db` | `postgres:16-alpine` | PostgreSQL database |
| `backend` | Custom (`docker/backend.Dockerfile`) | Spring Boot application |
| `web` | Custom (`docker/frontend.Dockerfile`) | Nginx serving Angular + reverse-proxying API |
| `ngrok` (optional) | `ngrok/ngrok:3` | Development tunnel for Mercado Pago sandbox |

## Architecture

```text
User → Nginx (port 80/443, unprivileged, non-root)
  ├── /api/*           → proxy_pass to backend:8080
  ├── /api-docs        → proxy_pass to backend:8080 (OpenAPI JSON)
  ├── /swagger-ui.html → proxy_pass to backend:8080
  ├── /uploads/*       → static files (product images)
  └── /*               → Angular SPA (index.html fallback)
```

- Nginx rejects `TRACE` requests and sets security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP).
- All images run as non-root users.
- The database is bound to `127.0.0.1` by default.

## Files

| File | Description |
|---|---|
| `docker/compose.yml` | Main Compose file with all services |
| `docker/ngrok.yml` | ngrok tunnel configuration for MP sandbox |
| `docker/backend.Dockerfile` | Java 21 multi-stage build with non-root runtime |
| `docker/frontend.Dockerfile` | Angular 22.14 build stage + unprivileged Nginx runtime |
| `docker/nginx.conf` | Nginx reverse proxy configuration |
| `docker/.env.example` | Environment variable template |

## Usage

See [`docker/README.md`](../docker/README.md) for full usage instructions, including:

- Full stack startup: `docker compose --env-file docker/.env -f docker/compose.yml up --build`
- Mercado Pago sandbox testing with ngrok tunnel
- Database reset and backup procedures
- Environment variable reference

## Key differences from development

| Aspect | Docker (prod profile) | Local development |
|---|---|---|
| Frontend | Built static files served by Nginx | Angular dev server (localhost:4200) |
| API proxy | Nginx reverse proxy | Angular proxy.conf.json |
| Images | Non-root users | Root (dev) |
| Swagger | Disabled in prod profile | Enabled in dev profile |
| Secure cookies | Enabled (`force-secure-cookies: true`) | Disabled |
