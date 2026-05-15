# Local Environment

## Services

The local development environment uses Docker Compose for PostgreSQL:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: lembas
      POSTGRES_USER: lembas
      POSTGRES_PASSWORD: lembas
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Backend (localhost:8080)

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend connects to the local PostgreSQL instance using environment variables defined in `.env` or `application-dev.yml`.

## Frontend (localhost:4200)

```bash
cd frontend
npm install
npm start
```

The frontend proxies API requests to the backend via `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false
  }
}
```

## Image storage

Product images are stored in `backend/uploads/` and served by the backend during development. In production, Nginx serves them as static files.

## Local URLs

| Service | URL |
|---|---|
| Frontend (Angular) | http://localhost:4200 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

## Demo users (seed data)

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@lembas.com | admin123 |
| MANAGER | manager@lembas.com | manager123 |
| EMPLOYEE | employee@lembas.com | employee123 |
| CUSTOMER | customer@lembas.com | customer123 |
