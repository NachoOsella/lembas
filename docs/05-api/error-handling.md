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
| PURCHASE_RECEIPT_INVALID_STATE | Suppliers | 409 | Purchase order is not sent or partially received |
| PURCHASE_RECEIPT_ITEM_INVALID | Suppliers | 400 | Receipt item does not belong to the selected purchase order |
| PURCHASE_RECEIPT_ITEM_DUPLICATED | Suppliers | 400 | Same purchase-order item was sent more than once in a receipt |
| PURCHASE_RECEIPT_OVER_RECEIVED | Suppliers | 409 | Received quantity exceeds ordered quantity |
| INSUFFICIENT_STOCK | Inventory | 409 | Total available stock is less than requested deduction quantity |
| INVALID_DEDUCTION_QUANTITY | Inventory | 400 | Deduction quantity must be positive |
| STOCK_LOT_NOT_FOUND | Inventory | 404 | Stock lot not found during deduction or stock reversal on cancellation |
| CANCEL_REASON_REQUIRED | Orders | 400 | Cancellation request is missing the `reason` field or it is blank / over 500 characters |
| CATEGORY_NOT_FOUND | Catalog | 404 | Category does not exist |
| PARENT_NOT_FOUND | Catalog | 404 | Parent category does not exist |
| PARENT_INVALID | Catalog | 409 | Category parent assignment is invalid |
| CATEGORY_NAME_DUPLICATED | Catalog | 409 | Same-level category name already exists |
| CATEGORY_HAS_CHILDREN | Catalog | 409 | Category cannot be deleted while subcategories exist |
| CATEGORY_HAS_PRODUCTS | Catalog | 409 | Category cannot be deleted while products reference it |
| SELF_ROLE_CHANGE_FORBIDDEN | Users | 403 | User attempted to change their own role |
| CASH_SESSION_ALREADY_OPEN | Cash | 409 | A cash session is already OPEN for the branch |
| CASH_SESSION_NOT_FOUND | Cash | 404 | No OPEN cash session exists for the branch (or the requested session id does not exist) |
| CASH_BRANCH_REQUIRED | Cash | 400 | ADMIN must select a branch to open or query a cash session |
| CASH_MOVEMENT_CLOSED_SESSION | Cash | 400 | Cannot register movements on a CLOSED cash session |
| CASH_SESSION_ALREADY_CLOSED | Cash | 409 | The cash session is already CLOSED; cannot be closed again |
| CASH_DIFFERENCE_REASON_REQUIRED | Cash | 400 | The close difference is non-zero and `cashDifferenceReason` is missing |
| POS_QUERY_REQUIRED | POS | 400 | POS product search `q` parameter is missing or blank |
| POS_QUERY_TOO_LONG | POS | 400 | POS product search `q` parameter exceeds 100 characters |
| ORDER_NOT_FOUND | Orders | 404 | Order does not exist |
| ORDER_INVALID_STATE | Orders | 409 | Order state transition is not allowed in the current status (e.g. cancelling a DELIVERED order) |
| ORDER_REFUNDED_CONFLICT | Orders | 409 | Cannot cancel an order whose payments have already been REFUNDED |

### Source-inventoried codes not listed above

The current backend also emits the following stable codes. Their statuses below reflect the `DomainException` constructors and payment constants in source; feature modules remain the owners of these rules:

| Code | Module | HTTP status |
|---|---|---|
| CATEGORY_HIERARCHY_CYCLE | Catalog | 409 |
| INVALID_DEDUCTION_QUANTITY | Inventory | 400 |
| ADJUSTMENT_REASON_REQUIRED | Inventory | 400 |
| ADJUSTMENT_QUANTITY_ZERO | Inventory | 400 |
| INVALID_ADJUSTMENT_TYPE | Inventory | 400 |
| INVALID_ADJUSTMENT_SIGN | Inventory | 400 |
| STOCK_LOT_MISMATCH | Inventory | 400 |
| STOCK_LOT_NOT_ACTIVE | Inventory | 409 |
| INVALID_ROLE_FILTER | Users | 400 |
| USER_NOT_FOUND | Users | 404 |
| BRANCH_INACTIVE | Users | 422 |
| SELF_ROLE_CHANGE_FORBIDDEN | Users | 403 |
| LAST_ADMIN_DISABLE_FORBIDDEN | Users | 400 |
| POS_QUERY_REQUIRED | POS | 400 |
| POS_QUERY_TOO_LONG | POS | 400 |
| SUPPLIER_CUIT_DUPLICATED | Suppliers | 409 |
| SUPPLIER_PRODUCT_NOT_FOUND | Suppliers | 404 |
| SUPPLIER_PRODUCT_DUPLICATED | Suppliers | 409 |
| PRICE_BATCH_NOT_FOUND | Suppliers | 404 |
| PRICE_BATCH_INVALID_STATE | Suppliers | 409 |
| PRICE_BATCH_HAS_UNRESOLVED_ITEMS | Suppliers | 409 |
| PRICE_BATCH_ITEM_INVALID | Suppliers | 400 |
| PRICE_BATCH_ITEM_NOT_FOUND | Suppliers | 404 |
| PRICE_BATCH_FILE_EMPTY | Suppliers | 400 |
| PRICE_BATCH_FILE_UNSUPPORTED | Suppliers | 400 |
| PRICE_BATCH_FILE_TOO_LARGE | Suppliers | 400 |
| PRICE_BATCH_REQUIRED_COLUMNS_MISSING | Suppliers | 400 |
| MP_INVALID_AMOUNT | Payments | 400 |
| MP_INVALID_RESPONSE | Payments | 502 |
| MP_PREFERENCE_REJECTED | Payments | 502 |
| MP_UNAUTHORIZED | Payments | 502 |
| MP_NOT_FOUND | Payments | 502 |
| MP_UPSTREAM_ERROR | Payments | 502 |
| MP_UNREACHABLE | Payments | 502 |
| ORDER_NOT_PAYABLE | Payments | 409 |
| PAYMENT_NOT_FOUND | Payments | 404 |
| WEBHOOK_SIGNATURE_INVALID | Payments | 401 |

Legacy planned codes that are not emitted by the backend were removed from the active catalog. The implemented cash difference code is `CASH_DIFFERENCE_REASON_REQUIRED`.

### Intentional response paths outside the controller advice

- The origin-validation filter constructs an `ApiError` directly with `INVALID_ORIGIN`, outside `GlobalExceptionHandler`; its payload shape is consistent with the shared DTO.
- Invalid Mercado Pago webhook signatures propagate through `GlobalExceptionHandler` and return the same `ApiError` contract as other domain failures.
- `PARENT_INVALID` consistently uses 409, `CATEGORY_NOT_FOUND` uses 404, and `PRICE_BATCH_ITEM_INVALID` uses 400 across their current emitters.

### Global exception handler

A single `@ControllerAdvice` handles:

- All DomainException subclasses (map code and status from the exception)
- MethodArgumentNotValidException (returns VALIDATION_ERROR with field-level details)
- HttpMessageNotReadableException (returns VALIDATION_ERROR for malformed JSON)
- AccessDeniedException (returns 403 ACCESS_DENIED)
- AuthenticationException (returns 401 UNAUTHORIZED)
- DataIntegrityViolationException (returns 409 DATA_INTEGRITY_VIOLATION)
- Generic Exception (returns 500 INTERNAL_ERROR, without stack trace)

### Validation error format

All validation-related errors use the same `details` object. Bean Validation returns one entry per field; malformed JSON returns an empty `fieldErrors` array because no field can be identified. Other error categories keep `details` null unless a feature-specific domain payload is explicitly provided.

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
