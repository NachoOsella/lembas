# Security Architecture

## Authentication

- JWT-based stateless authentication
- Access and refresh JWTs are delivered as `HttpOnly` cookies with `SameSite=Strict`
- Unsafe `/api/**` requests with an `Origin` header are rejected unless the origin is explicitly allowed
- Tokens expire after 24 hours
- Passwords hashed with BCrypt
- No server-side sessions

## Authorization (RBAC)

### Roles

| Role | Description | branch_id |
|---|---|---|
| ADMIN | Full system access | Optional (null = global) |
| MANAGER | Operational management of a branch | Required |
| EMPLOYEE | Sales, preparation/cancellation, stock operations, receipts, cash register | Required |
| CUSTOMER | Registered customer who purchases online | Must be null |

### Access matrix

| Module | ADMIN | MANAGER | EMPLOYEE | CUSTOMER |
|---|---|---|---:|---:|---:|
| Public catalog | Yes | Yes | Yes | Yes |
| Online purchase | -- | -- | -- | Yes |
| Products (CRUD) | Yes | Partial | No | No |
| Stock (management) | Yes | Yes | Yes (assigned branch) | No |
| Cash register (open/close) | Yes | Yes | Yes | No |
| In-store sales (POS) | Yes | Yes | Yes | No |
| Orders | Yes | Yes | Preparation/cancellation | Own only |
| Suppliers | Yes | Query only | No | No |
| Reports | Yes (global) | Yes (branch) | No | No |
| Internal users | Yes | Partial | Own profile only | No |
| Online payments (MP) | -- | -- | -- | Yes |
| MP webhooks | -- | -- | -- | -- |

### Spring Security configuration

```text
SecurityFilterChain
  ├── CorsFilter
  ├── CsrfFilter (DISABLED) -- API REST stateless; cookie CSRF risk is mitigated by SameSite=Strict + OriginValidationFilter
  ├── OriginValidationFilter (unsafe API methods only)
  ├── JwtAuthenticationFilter (Authorization header or HttpOnly access cookie)
  └── ExceptionHandlerFilter

Public routes:   POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, /api/store/**, /api/webhooks/**, /uploads/**
Authenticated:   GET /api/auth/me
Customer routes: /api/customer/** (role CUSTOMER)
Admin routes:    /api/admin/** (roles ADMIN, MANAGER, EMPLOYEE; each controller applies the access matrix below)
POS routes:      /api/pos/** (roles ADMIN, MANAGER, EMPLOYEE)
```

### @PreAuthorize annotations

```java
// Public
@PermitAll on POST /api/auth/register, POST /api/auth/login, /api/store/**, /api/webhooks/**

// Customer
@PreAuthorize("hasRole('CUSTOMER')") on /api/customer/**

// Admin
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')") on shared operational admin endpoints
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')") on reports, recommendations, catalog management, purchasing-order writes, suppliers, and pricing
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE')") on stock writes, merchandise receipts, and order cancellation
@PreAuthorize("hasRole('ADMIN')") on user and branch management
@PreAuthorize("hasRole('CUSTOMER')") on /api/customer/**

// ADMIN only
@PreAuthorize("hasRole('ADMIN')") on user management, configuration
```

## Audit

Critical actions are logged in `audit_logs` with user, timestamp, and description:

- Price changes
- Stock adjustments
- Order cancellations
- Cash register opening and closing
- Cash movements
- Payment confirmation (MP webhook)
- User enable/disable

## Security checklist

| Item | Status |
|---|---|
| Passwords hashed with BCrypt | MVP |
| JWT with expiration (24h) | MVP |
| Role-based access control | MVP |
| CORS configuration | MVP |
| Input validation | MVP |
| SQL injection protection (JPA) | MVP |
| No sensitive card data stored | MVP |
| Rate limiting on login | MVP |
| HTTPS (via Nginx) | Deployment |
| CSRF disabled with SameSite=Strict cookies and origin validation for unsafe API requests | MVP |
