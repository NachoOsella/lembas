# Frontend Architecture

## Stack

| Component | Technology |
|---|---|
| Framework | Angular (standalone components) |
| State management | Signals (no NgRx) |
| UI component library | PrimeNG |
| CSS framework | Tailwind CSS |
| Lazy loading | Per-feature route modules |
| HTTP | Angular HttpClient with interceptors |
| Guards | AuthGuard, AdminGuard |

## Project structure

```text
src/app/
  core/             -- Auth, interceptors, guards, layout
  shared/           -- Reusable UI components, pipes, models
  features/
    auth/           -- Login and registration
    branches/       -- Branch selection and store-branch state
    cash/           -- Cash register opening, detail, movement form, closing
    catalog/        -- Product grid, selector, status badges
    checkout/       -- Cart state (localStorage)
    customer/       -- Authenticated customer (CUSTOMER role)
      profile/
      orders/
      order-detail/
      payment-callback/
    dashboard/      -- Operational dashboard with stat cards, charts, top products
    dev/            -- Component showcase (/dev/ui)
    inventory/      -- Stock table, toolbar, adjustment form, lot form
    orders/         -- Order state, presentation, stores (shared across admin + customer)
    public-store/   -- Public catalog (no auth required)
      catalog/
      product-detail/
      legal/        -- Terms and Conditions, FAQ
    reports/        -- Report filter bar, grid, panel, recommendation cards
    suppliers/      -- Price update batches, purchase orders, supplier management
    users/          -- Internal user management
    admin/          -- Backoffice shell (layout, navigation, routes)
      admin-layout/
```

## Route structure

```text
/store                        → Public catalog (default redirect /catalog → /store)
/store/catalog                → Public catalog with products
/store/products/:id           → Product detail
/store/terms                  → Terms and Conditions
/store/faq                    → FAQ
/auth/login                   → Login
/auth/register                → Registration
/cart                         → Local cart page
/customer/orders              → Customer order history
/customer/orders/:id          → Customer order detail
/customer/profile             → Customer profile
/customer/payment/callback    → Payment result (MP redirect)
/error/500                    → Generic error page
/admin                        → Backoffice dashboard
  /admin/dashboard             → Operational dashboard
  /admin/categories            → Category management
  /admin/products              → Product management
    /admin/products/new        → New product form
    /admin/products/:id/edit   → Edit product form
  /admin/inventory              → Stock and lots
    /admin/inventory/product/:productId/lots → Lots for a product
  /admin/stock/entry            → Stock entry via purchase receipt
  /admin/stock/receipts         → Purchase receipt management
  /admin/receps                 → Purchase receipts (Spanish alias)
  /admin/receipts               → Purchase receipts (alias)
  /admin/stock/movements        → Stock movement history
  /admin/orders                 → Order list
    /admin/orders/:id           → Order detail
  /admin/pos                    → Point of Sale
  /admin/cash                   → Cash register landing
  /admin/cash/open              → Open cash session
  /admin/cash/history           → Cash session history
    /admin/cash/history/:sessionId → Cash session detail (history)
  /admin/cash/:id               → Cash session detail (direct)
  /admin/cash/close/:sessionId  → Close cash session
  /admin/suppliers              → Supplier management
    /admin/suppliers/:id/products → Supplier product associations
  /admin/purchase-orders        → Purchase order management
  /admin/pricing                → Price update batches
  /admin/reports                → Reports hub
  /admin/reports/cash           → Cash overview report
  /admin/reports/sales          → Sales report
  /admin/reports/employees      → Employee performance report
  /admin/reports/inventory      → Inventory valuation report
  /admin/reports/suppliers      → Supplier performance report
  /admin/recommendations        → Rule-based recommendations
  /admin/users                  → Internal user management
```

## Shopping cart (localStorage)

The cart is managed entirely on the frontend using localStorage:

```typescript
@Injectable({ providedIn: 'root' })
class CartService {
  private localStorageKey = 'lembas_cart';
  private items = signal<CartItem[]>(this.loadFromStorage());

  getItems() { return this.items.asReadonly(); }
  addItem(product, quantity, branchId) { ... this.saveToStorage(); }
  removeItem(productId) { ... this.saveToStorage(); }
  clear() { this.items.set([]); localStorage.removeItem(this.localStorageKey); }
}
```

## Checkout flow with Mercado Pago

```
1. Customer confirms cart
2. Frontend calls POST /api/customer/orders
3. Backend creates order (PENDING_PAYMENT) and payment (PENDING)
4. Frontend receives orderId
5. Frontend calls POST /api/customer/orders/{orderId}/payments/preference
6. Backend creates MP preference
7. Frontend receives initPoint
8. Frontend redirects to MP (window.location.href = initPoint)
9. MP redirects back to frontend (result page)
10. Frontend polls GET /api/customer/orders/{orderId} for final status
11. MP webhook processes in background
```

## Guards (functional)

| Guard | Routes | Logic |
|---|---|---|
| `authGuard` | /customer/**, /admin/** | Redirect to /auth/login if not authenticated |
| `customerGuard` | /customer/** | Requires CUSTOMER role |
| `adminGuard` | /admin/** | Requires ADMIN, MANAGER, or EMPLOYEE role |
| `roleGuard(...roles)` | Specific admin sub-routes | Requires one of the specified roles; used for fine-grained access (e.g., dashboard, categories, reports, users)

## UI principles

- PrimeNG is the main component library (tables, dialogs, dropdowns, filters, forms)
- Tailwind CSS is used for layout, spacing, responsive breakpoints, and custom styling
- Do not mix PrimeNG with Angular Material or other UI libraries
- Components contain no business logic (delegated to services)
- All states are handled: loading (skeleton), empty (empty state), error (error alert with retry)
