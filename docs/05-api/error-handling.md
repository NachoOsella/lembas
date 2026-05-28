# Error Handling

## Principle

All API errors follow a uniform format. This enables the frontend interceptor to handle errors globally and provides consistent responses for API consumers.

## Error response format

```json
{
  "status": 409,
  "code": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for product Granola 500g",
  "details": {
    "productId": 123,
    "available": 2,
    "requested": 5,
    "branchId": 1
  },
  "timestamp": "2026-05-12T15:30:00Z",
  "path": "/api/customer/orders"
}
```

### Field descriptions

| Field | Description |
|---|---|
| status | HTTP status code |
| code | Semantic error code (machine-readable) |
| message | Human-readable error description |
| details | Optional object with additional context |
| timestamp | ISO 8601 timestamp of the error |
| path | The request path that caused the error |

## Backend implementation

### DomainException hierarchy

```text
DomainException (base)
  ├── ProductNotFoundException
  ├── ProductNotPublishedException
  ├── InsufficientStockException
  ├── LotExpiredException
  ├── OrderNotFoundException
  ├── OrderInvalidStateException
  ├── PaymentFailedException
  ├── MercadoPagoException
  ├── CashSessionNotOpenException
  ├── CashSessionAlreadyOpenException
  ├── CashDifferenceException
  ├── InvalidCredentialsException
  ├── AccountDisabledException
```

### Global exception handler

A single `@ControllerAdvice` handles:

- All DomainException subclasses (map code and status from the exception)
- MethodArgumentNotValidException (returns VALIDATION_ERROR with field-level details)
- HttpMessageNotReadableException (returns VALIDATION_ERROR for malformed JSON)
- AccessDeniedException (returns 403)
- AuthenticationException (returns 401)
- DataIntegrityViolationException (returns 409 DATA_INTEGRITY_VIOLATION)
- Generic Exception (returns 500 INTERNAL_ERROR, without stack trace)

### Validation error format

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fieldErrors": [
      { "field": "email", "message": "must be a valid email address" },
      { "field": "password", "message": "must be at least 8 characters" }
    ]
  },
  "timestamp": "2026-05-12T15:30:00Z",
  "path": "/api/auth/register"
}
```

## Frontend error handling

### HTTP Error Interceptor

A global Angular HTTP interceptor handles all API errors:

| HTTP Status | Action |
|---|---|
| 401 | Redirect to login page |
| 403 | Redirect to home (or show forbidden message) |
| 404 | Show not-found page or message |
| 409 | Show business rule violation message (e.g., insufficient stock) |
| 422 | Show validation error details |
| 500 | Show generic error message |
| Network error | Show connection error message |

### Toast notifications

Errors are displayed using a global toast/snackbar component (PrimeNG Toast):

- Error messages appear in the top-right corner
- Auto-dismiss after 5 seconds
- Click to dismiss immediately
- Color-coded by severity (error=red, warning=yellow, info=blue, success=green)
