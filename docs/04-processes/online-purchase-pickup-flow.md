# Process: Online Purchase with Pickup

> This is the main end-to-end flow for the MVP. Customer registers, browses, purchases online, and picks up at the branch.

## Sequence diagram

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Frontend
    participant BE as Backend
    participant MP as MercadoPago
    participant DB as PostgreSQL

    Note over C,DB: 0. REGISTRATION AND LOGIN
    C->>FE: Register / Login
    FE->>BE: POST /api/auth/register or /api/auth/login
    BE-->>FE: JWT token (CUSTOMER role)

    Note over C,DB: 1. CATALOG AND LOCAL CART
    C->>FE: Browse catalog, add products
    FE->>BE: GET /api/store/products
    BE->>DB: Query products + stock
    DB-->>BE: Available products
    BE-->>FE: Catalog
    FE->>FE: CartService (localStorage)

    Note over C,DB: 2. CREATE ORDER
    C->>FE: Confirm purchase
    FE->>BE: POST /api/customer/orders (with token)
    BE->>DB: Validate stock, INSERT order (type=ONLINE, status=PENDING_PAYMENT)
    BE->>DB: INSERT order_items (snapshots)
    BE->>DB: INSERT payment (provider=MERCADO_PAGO, method=CHECKOUT_PRO, status=PENDING)
    BE-->>FE: { orderId, orderNumber, total }

    Note over C,DB: 3. MP CHECKOUT
    C->>FE: Proceed to payment
    FE->>BE: POST /api/customer/orders/{orderId}/payments/preference
    BE->>MP: Create payment preference
    MP-->>BE: { initPoint, preferenceId }
    BE->>DB: UPDATE payment SET provider_preference_id, external_reference
    BE-->>FE: { initPoint }
    FE->>FE: Redirect to window.location.href = initPoint

    Note over C,DB: 4. PAYMENT IN MP
    C->>MP: Complete payment in MP Checkout Pro
    MP->>FE: Redirect to result page
    FE->>BE: GET /api/customer/orders/{orderId} (check status)

    Note over C,DB: 5. MP WEBHOOK
    MP->>BE: POST /api/webhooks/mercadopago
    BE->>BE: Verify signature
    BE->>MP: Query real payment status
    MP-->>BE: Payment APPROVED
    BE->>BE: @Transactional
    BE->>DB: UPDATE payment (status=APPROVED, approved_at)
    BE->>DB: Re-validate stock (FOR UPDATE)
    BE->>DB: UPDATE stock_lots (deduct FEFO)
    BE->>DB: INSERT stock_movement (type=ONLINE_SALE)
    BE->>DB: UPDATE order (status=PAID)
    BE-->>MP: 200 OK

    Note over C,DB: 6. PREPARATION AND PICKUP
    actor E as Employee
    E->>FE: See PAID orders
    E->>FE: Mark PREPARING → PATCH /api/admin/orders/{id}/prepare
    E->>FE: Mark READY → PATCH /api/admin/orders/{id}/ready
    C-->>E: Customer picks up
    E->>FE: Mark DELIVERED → PATCH /api/admin/orders/{id}/delivered
```

## Business rules

| Rule | Step |
|---|---|
| Customer must be registered (CUSTOMER role) | 0 |
| Cart is local (localStorage) | 1 |
| Order created as PENDING_PAYMENT, stock NOT deducted yet | 2 |
| Payment created alongside the order (PENDING) | 2 |
| MP checkout creates preference (separate endpoint) | 3 |
| Webhook verifies signature AND queries real status from MP | 5 |
| If APPROVED: update payment, deduct FEFO, order to PAID | 5 |
| If REJECTED: update payment, order to PAYMENT_FAILED | 5 |
| If approved but no stock: order to STOCK_CONFLICT | 5 |
| DELIVERED only changes status, does NOT deduct stock again. DELIVERED = handed to customer at branch (NOT home delivery). | 6 |
