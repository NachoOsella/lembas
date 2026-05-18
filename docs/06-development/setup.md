# Development Setup

## Prerequisites

| Tool | Version | Required for |
|---|---|---|
| Java | 21+ | Backend |
| Node.js | 20+ | Frontend |
| Docker | Latest | PostgreSQL, local environment |
| Docker Compose | Latest | Local infrastructure |

## Quick start

```bash
# 1. Clone the repository
git clone <repo-url>
cd dietetica-lembas

# 2. Start PostgreSQL
docker compose up -d db

# 3. Start backend
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 4. Start frontend (in another terminal)
cd frontend
npm install
npm start
```

## Backend setup

```bash
cd backend

# Run tests
./mvnw test

# Run tests with coverage
./mvnw verify

# Package
./mvnw package -DskipTests

# Run with specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Profiles

| Profile | Database | Payments | Use case |
|---|---|---|---|
| dev | Local PostgreSQL | Local Mercado Pago config | Development |
| test | Testcontainers | Mocked Mercado Pago calls | Automated tests |
| prod | Production PostgreSQL | Mercado Pago production config | Deployment |

## Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm start

# Run tests
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

The frontend dev server runs on `http://localhost:4200` and proxies API requests to `http://localhost:8080` via `proxy.conf.json`.

## Docker Compose

```bash
# Start all services
docker compose up -d

# Start only database
docker compose up -d db

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Reset database (delete volume)
docker compose down -v
```

## Environment variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lembas
DB_USER=lembas
DB_PASSWORD=lembas

# JWT
JWT_SECRET=your-secret-key-at-least-256-bits

# Mercado Pago (for production profile)
MP_ACCESS_TOKEN=TEST-...
MP_WEBHOOK_SECRET=your-webhook-secret
MP_SUCCESS_URL=http://localhost:4200/customer/payment/callback
MP_FAILURE_URL=http://localhost:4200/customer/payment/callback
MP_PENDING_URL=http://localhost:4200/customer/payment/callback
```

## Project structure

```text
dietetica-lembas/
├── backend/           # Spring Boot application
│   ├── src/
│   └── pom.xml
├── frontend/          # Angular application
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```
