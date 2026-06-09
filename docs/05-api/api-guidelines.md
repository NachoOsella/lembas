# API Guidelines

## Base URL

```
/api/v1
```

In the MVP, the prefix is `/api` (versioning can be added later if needed).

## URL spaces

| Space | Access | Authentication |
|---|---|---|
| `/api/auth/**` | Public | None |
| `/api/store/**` | Public | None |
| `/api/customer/**` | CUSTOMER role | JWT required |
| `/api/admin/**` | ADMIN, MANAGER, EMPLOYEE | JWT required |
| `/api/webhooks/**` | Public (signature verified) | None |

## REST conventions

- Resources in plural: `/products`, `/orders`, `/stock/lots`
- IDs in path: `/orders/{id}`
- Actions as sub-resources: `/orders/{id}/cancel`, `/orders/{id}/prepare`
- Query parameters for filtering, searching and pagination
- HTTP methods for CRUD: GET, POST, PUT, PATCH, DELETE

## Request format

- POST and PUT/PATCH requests use `Content-Type: application/json`
- File uploads (images): `multipart/form-data`

## Response format

### Successful responses

Return the DTO directly with appropriate HTTP status:

```json
// GET /api/admin/products/123
// Status: 200
{
  "id": 123,
  "name": "Granola 500g",
  "barcode": "7791234567890",
  "category": { "id": 5, "name": "Cereals" },
  "brandName": "NaturalLife",
  "salePrice": 4900.00,
  "onlineStatus": "PUBLISHED",
  "imageUrl": "/uploads/products/123.jpg",
  "createdAt": "2026-05-01T10:00:00Z"
}
```

### Created responses

```json
// POST /api/admin/products
// Status: 201
{
  "id": 124,
  "name": "..."
}
```

### No content

```json
// DELETE /api/admin/products/{id}
// Status: 204
```

### Paginated responses

```json
GET /api/admin/products?page=0&size=20

// Status: 200
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8,
  "last": false
}
```

## Error format

All errors use a uniform `ApiError` object:

```json
{
  "status": 409,
  "code": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for product Granola 500g",
  "details": { "productId": 123, "available": 2, "requested": 5, "branchId": 1 },
  "timestamp": "2026-05-12T15:30:00Z",
  "path": "/api/customer/orders"
}
```

### HTTP status codes

| Code | Usage |
|---|---|
| 200 | Successful GET, PATCH, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Validation error (VALIDATION_ERROR) |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but insufficient permissions |
| 404 | Resource not found |
| 409 | Business rule violation (conflict) |
| 422 | Unprocessable entity (e.g., missing required field for business logic) |
| 500 | Internal server error (unexpected) |

## Error codes

| Code | Module | HTTP status |
|---|---|---|
| INVALID_CREDENTIALS | Auth | 401 |
| ACCOUNT_DISABLED | Auth | 403 |
| INVALID_REFRESH_TOKEN | Auth | 401 |
| INVALID_ORIGIN | Security | 403 |
| EMAIL_DUPLICATED | Auth, Users | 409 |
| INVALID_USER_BRANCH | Users | 400 |
| PRODUCT_NOT_FOUND | Catalog | 404 |
| PRODUCT_NOT_PUBLISHED | Catalog | 404 |
| PRODUCT_BARCODE_DUPLICATED | Catalog | 409 |
| PRODUCT_STATUS_INVALID_TRANSITION | Catalog | 409 |
| CATEGORY_NOT_FOUND | Catalog | 404 |
| PARENT_NOT_FOUND | Catalog | 404 |
| PARENT_INVALID | Catalog | 409 |
| CATEGORY_NAME_DUPLICATED | Catalog | 409 |
| CATEGORY_HAS_CHILDREN | Catalog | 409 |
| CATEGORY_HAS_PRODUCTS | Catalog | 409 |
| INSUFFICIENT_STOCK | Inventory | 409 |
| LOT_EXPIRED | Inventory | 409 |
| BRANCH_NOT_FOUND | Inventory | 404 |
| STOCK_LOT_NOT_FOUND | Inventory | 404 |
| STOCK_LOT_MISMATCH | Inventory | 400 |
| STOCK_LOT_NOT_ACTIVE | Inventory | 409 |
| ADJUSTMENT_REASON_REQUIRED | Inventory | 400 |
| ADJUSTMENT_QUANTITY_ZERO | Inventory | 400 |
| INVALID_ADJUSTMENT_TYPE | Inventory | 400 |
| INVALID_ADJUSTMENT_SIGN | Inventory | 400 |
| SUPPLIER_NOT_FOUND | Suppliers | 404 |
| PURCHASE_ORDER_NOT_FOUND | Suppliers | 404 |
| PURCHASE_ORDER_INVALID_STATE | Suppliers | 409 |
| PURCHASE_ORDER_EMPTY | Suppliers | 400 |
| PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID | Suppliers | 409 |
| PURCHASE_RECEIPT_INVALID_STATE | Suppliers | 409 |
| PURCHASE_RECEIPT_ITEM_INVALID | Suppliers | 400 |
| PURCHASE_RECEIPT_ITEM_DUPLICATED | Suppliers | 400 |
| PURCHASE_RECEIPT_OVER_RECEIVED | Suppliers | 409 |
| PRICE_BATCH_NOT_FOUND | Suppliers | 404 |
| PRICE_BATCH_INVALID_STATE | Suppliers | 409 |
| PRICE_BATCH_HAS_UNRESOLVED_ITEMS | Suppliers | 409 |
| PRICE_BATCH_ITEM_INVALID | Suppliers | 400/409 |
| PRICE_BATCH_ITEM_NOT_FOUND | Suppliers | 404 |
| PRICE_BATCH_FILE_EMPTY | Suppliers | 400 |
| PRICE_BATCH_FILE_UNSUPPORTED | Suppliers | 400 |
| PRICE_BATCH_FILE_TOO_LARGE | Suppliers | 400 |
| PRICE_BATCH_REQUIRED_COLUMNS_MISSING | Suppliers | 400 |
| ORDER_NOT_FOUND | Orders | 404 |
| ORDER_INVALID_STATE | Orders | 409 |
| PAYMENT_FAILED | Payments | 409 |
| MERCADO_PAGO_ERROR | Payments | 502 |
| CASH_SESSION_ALREADY_OPEN | Cash | 409 |
| CASH_SESSION_NOT_OPEN | Cash | 409 |
| DIFFERENCE_REASON_REQUIRED | Cash | 422 |
| VALIDATION_ERROR | Shared | 400 |
| DATA_INTEGRITY_VIOLATION | Shared | 409 |
| INTERNAL_ERROR | Shared | 500 |

## Pagination

```text
page:    0-based page number (default: 0)
size:    items per page (default: 20, max: 100)
sort:    field,direction (e.g., "createdAt,desc")
```

## API versioning

In the MVP, there is no explicit version prefix. If breaking changes are needed in the future, endpoints will be prefixed with `/api/v2/` while maintaining backward compatibility.
