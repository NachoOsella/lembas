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
  core/           -- Auth, interceptors, guards, layout
  shared/         -- Reusable UI components, pipes, models
  features/
    public-store/ -- Public catalog (no auth required)
      catalog/
      product-detail/
    customer/     -- Authenticated customer (CUSTOMER role)
      profile/
      orders/
      order-detail/
      checkout/   -- MP redirect, payment result
    admin/        -- Backoffice (ADMIN/MANAGER/EMPLOYEE)
      dashboard/
      products/
      inventory/
      orders/
      pos/        -- Point of Sale
      cash/       -- Open, close, movements
      suppliers/
      reports/
      users/
    auth/         -- Login and registration
```

## Route structure

```text
/store                    → Public catalog
/store/product/:id       → Product detail
/auth/login              → Login
/auth/register           → Registration
/cart                    → Local cart page
/customer/orders         → Customer order history
/customer/orders/:id     → Customer order detail
/customer/profile        → Customer profile
/admin                   → Backoffice dashboard
  /admin/products        → Product management
  /admin/stock           → Stock and lots
  /admin/orders          → Order management
  /admin/pos             → Point of Sale
  /admin/cash            → Cash register
  /admin/suppliers       → Supplier management
  /admin/reports         → Reports and recommendations
  /admin/users           → Internal user management
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
5. Frontend calls POST /api/customer/orders/{orderId}/checkout/mp
6. Backend creates MP preference
7. Frontend receives initPoint
8. Frontend redirects to MP (window.location.href = initPoint)
9. MP redirects back to frontend (result page)
10. Frontend polls GET /api/customer/orders/{orderId} for final status
11. MP webhook processes in background
```

## Guards

| Guard | Routes | Logic |
|---|---|---|
| AuthGuard | /customer/**, /admin/** | Redirect to /auth/login if not authenticated |
| AdminGuard | /admin/** | Requires ADMIN, MANAGER, or EMPLOYEE role |
| CustomerGuard | /customer/** | Requires CUSTOMER role |

## UI principles

- PrimeNG is the main component library (tables, dialogs, dropdowns, filters, forms)
- Tailwind CSS is used for layout, spacing, responsive breakpoints, and custom styling
- Do not mix PrimeNG with Angular Material or other UI libraries
- Components contain no business logic (delegated to services)
- All states are handled: loading (skeleton), empty (empty state), error (error alert with retry)
