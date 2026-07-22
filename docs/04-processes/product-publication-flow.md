# Process: Product Publication

## Flow

```text
Admin completes product form
    ↓
Admin saves (POST /api/admin/products)
    ↓
System creates product with online_status = DRAFT
    ↓
Admin changes status (PATCH /api/admin/products/{id}/status)
    ↓
Product transitions to PUBLISHED
    ↓
Customer sees product in the online catalog
```

## Product states

```text
DRAFT → PUBLISHED → PAUSED → PUBLISHED
                  → HIDDEN
```

## Rules

- A product can exist without initial stock (it just won't be available for purchase)
- DRAFT products do not appear in the online store
- PUBLISHED products appear in the store, filtered by stock availability
- PAUSED hides the product temporarily without losing configuration
- HIDDEN is a permanent removal from the online catalog (soft delete for store)
- Only ADMIN and MANAGER can change the online status
- The online status change requires MANAGER or ADMIN role (enforced via `@PreAuthorize`); a future `audit_logs` table would record the event permanently
