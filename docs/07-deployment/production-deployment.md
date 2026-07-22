# Production Deployment

## Architecture

```text
User → Nginx (port 80/443)
           ├── /api/* → Spring Boot backend (internal port 8080)
           ├── /uploads/* → Static files (product images)
           └── /* → Angular static files
```

## Requirements

- Linux server (Ubuntu 22.04+ or Debian 12+)
- Docker and Docker Compose
- Domain name (optional, for production)
- SSL certificate (optional, via Let's Encrypt)

## Deployment steps

```bash
# 1. Clone the repository on the server
git clone <repo-url> /opt/lembas
cd /opt/lembas

# 2. Configure environment
cp .env.example .env
# Edit .env with production values:
#   DB_PASSWORD=secure-random-password
#   JWT_SECRET=secure-random-256-bit-key
#   MP_ACCESS_TOKEN=production-token
#   MP_WEBHOOK_SECRET=production-webhook-secret

# 3. Build and start
docker compose up -d --build

# 4. Verify
curl http://localhost/api/store/products
curl http://localhost/api/auth/health

# 5. Configure reverse proxy with SSL (if using domain)
# Example with nginx + certbot:
sudo certbot --nginx -d lembas.example.com
```

## Nginx configuration

```nginx
server {
    listen 80;
    server_name lembas.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name lembas.example.com;

    ssl_certificate /etc/letsencrypt/live/lembas.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lembas.example.com/privkey.pem;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploaded images
    location /uploads/ {
        alias /usr/share/nginx/uploads/;
        expires 7d;
    }
}
```

## Health check

```bash
# Backend health (via Spring Boot Actuator)
GET /actuator/health
Response: { "status": "UP" }
```

> Note: The Actuator health endpoint is included in the public permit-all route set in `SecurityConfig`. It exposes only the `health` and `info` endpoints. The `/api/auth/health` path does not exist in the implementation.

## Backup

```bash
# Database backup
docker compose exec db pg_dump -U lembas lembas > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260501.sql | docker compose exec -T db psql -U lembas
```

## Monitoring

- Docker logs: `docker compose logs -f`
- Application health: `/api/auth/health`
- Database: PostgreSQL logs
- Resource usage: `docker stats`
