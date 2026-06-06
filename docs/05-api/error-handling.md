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

### DomainException model

Business-rule failures use `DomainException`, which carries the complete error contract for the frontend:

- `code`: stable machine-readable error code used by clients for message mapping
- `status`: HTTP status returned by the API
- `message`: backend error description; clients should prefer `code` for user-facing copy

Services may throw `DomainException` directly when a dedicated exception subclass is not needed. The frontend must not depend on Java exception class names or raw backend messages.

### Sprint 1 business error codes

| Code | Module | HTTP status | Typical scenario |
|---|---|---|---|
| INVALID_CREDENTIALS | Auth | 401 | Login credentials do not match an active user |
| ACCOUNT_DISABLED | Auth | 403 | User account exists but is disabled |
| EMAIL_DUPLICATED | Auth, Users | 409 | Email already belongs to another user |
| INVALID_USER_BRANCH | Users | 400 | MANAGER or EMPLOYEE has no branch, or ADMIN has one |
| PRODUCT_NOT_FOUND | Catalog | 404 | Product does not exist or is inactive |
| PRODUCT_NOT_PUBLISHED | Catalog | 404 | Storefront product is not published |
| PRODUCT_BARCODE_DUPLICATED | Catalog | 409 | Active product already uses the barcode |
| PRODUCT_STATUS_INVALID_TRANSITION | Catalog | 409 | Online status transition is not allowed |
| BRANCH_NOT_FOUND | Inventory | 404 | Branch does not exist or is inactive for stock entry |
| SUPPLIER_NOT_FOUND | Suppliers | 404 | Supplier does not exist or is inactive |
| SUPPLIER_CUIT_DUPLICATED | Suppliers | 409 | Active supplier already uses the CUIT |
| SUPPLIER_PRODUCT_NOT_FOUND | Suppliers | 404 | Product-supplier association does not exist or is inactive |
| SUPPLIER_PRODUCT_DUPLICATED | Suppliers | 409 | Product is already associated with that supplier |
| PURCHASE_ORDER_NOT_FOUND | Suppliers | 404 | Purchase order does not exist |
| PURCHASE_ORDER_INVALID_STATE | Suppliers | 409 | Purchase order transition or edit is not allowed in current state |
| PURCHASE_ORDER_EMPTY | Suppliers | 400 | Purchase order has no items |
| PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID | Suppliers | 409 | Selected product is not associated with the selected supplier |
| CATEGORY_NOT_FOUND | Catalog | 404 | Category does not exist |
| PARENT_NOT_FOUND | Catalog | 404 | Parent category does not exist |
| PARENT_INVALID | Catalog | 409 | Category parent assignment is invalid |
| CATEGORY_NAME_DUPLICATED | Catalog | 409 | Same-level category name already exists |
| CATEGORY_HAS_CHILDREN | Catalog | 409 | Category cannot be deleted while subcategories exist |
| CATEGORY_HAS_PRODUCTS | Catalog | 409 | Category cannot be deleted while products reference it |
| SELF_ROLE_CHANGE_FORBIDDEN | Users | 403 | User attempted to change their own role |

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
