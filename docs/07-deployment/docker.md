# Docker

## Production deployment architecture

```text
Nginx (reverse proxy, port 80/443)
  ├── /api/*      → Spring Boot backend (port 8080)
  ├── /uploads/*  → Static files (product images)
  └── /*          → Angular frontend (built files)
```

## Docker Compose (production)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - frontend-build:/usr/share/nginx/html
      - backend-uploads:/usr/share/nginx/uploads
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=lembas
      - DB_USER=lembas
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - MP_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
      - MP_WEBHOOK_SECRET=${MP_WEBHOOK_SECRET}
    volumes:
      - backend-uploads:/app/uploads
    depends_on:
      - db

  frontend:
    build: ./frontend
    volumes:
      - frontend-build:/app/dist

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: lembas
      POSTGRES_USER: lembas
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
```

## Dockerfile (backend)

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Dockerfile (frontend)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/dietetica-lembas/browser /usr/share/nginx/html
EXPOSE 80
```

## Commands

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Reset database
docker compose down -v
```
