# Frontend Conventions

## Component structure

Each feature component follows:

```text
<component-name>/
  <component-name>.component.ts
  <component-name>.component.html
  <component-name>.component.css
  <component-name>.component.spec.ts
```

## Naming

| Element | Convention | Example |
|---|---|---|
| Component class | PascalCase + Component | `ProductListComponent` |
| Component selector | kebab-case | `app-product-list` |
| Component file | kebab-case | `product-list.component.ts` |
| Service class | PascalCase + Service | `ProductService` |
| Service file | kebab-case | `product.service.ts` |
| Guard class | PascalCase + Guard | `AuthGuard` |
| Guard file | kebab-case | `auth.guard.ts` |

## State management

- Use Angular Signals (`signal`, `computed`, `effect`)
- Services hold state, not components
- Readonly signals exposed via `.asReadonly()`

```typescript
@Injectable({ providedIn: 'root' })
class CartService {
  private cartItems = signal<CartItem[]>([]);
  readonly items = this.cartItems.asReadonly();
  readonly total = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
}
```

## HTTP services

- Each domain area has its own service
- Use Angular HttpClient
- Error handling delegated to global interceptor

```typescript
@Injectable({ providedIn: 'root' })
class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(filters: ProductFilter): Observable<PaginatedResponse<ProductDto>> {
    const params = new HttpParams({ fromObject: filters as any });
    return this.http.get<PaginatedResponse<ProductDto>>('/api/store/products', { params });
  }
}
```

## Component patterns

### All states pattern

Every data-loading component handles four states:

```html
@if (loading()) {
  <app-skeleton />
} @else if (error()) {
  <app-error [message]="error()" (retry)="load()" />
} @else if (items().length === 0) {
  <app-empty-state message="No products found" />
} @else {
  <div class="grid">
    @for (item of items(); track item.id) {
      <app-product-card [product]="item" />
    }
  </div>
}
```

### Form pattern

```typescript
class ProductFormComponent {
  private fb = inject(FormBuilder);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    barcode: [''],
    salePrice: [0, [Validators.required, Validators.min(0)]],
    categoryId: [null as number | null, Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit(): void { ... }
}
```

## Guards

- AuthGuard: checks for valid JWT token, redirects to /auth/login
- AdminGuard: checks for ADMIN/MANAGER/EMPLOYEE role
- CustomerGuard: checks for CUSTOMER role

## UI conventions

- Use PrimeNG components for tables, dialogs, dropdowns, forms
- Use Tailwind CSS for layout, spacing, responsive design, custom styling
- Do not mix PrimeNG with other UI libraries
- Components are standalone (no NgModules)
- Lazy loading for all feature routes

## Route structure

```typescript
const routes: Routes = [
  { path: 'store', loadChildren: () => import('./features/public-store/public-store.routes') },
  { path: 'customer', loadChildren: () => import('./features/customer/customer.routes'), canActivate: [AuthGuard, CustomerGuard] },
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes'), canActivate: [AuthGuard, AdminGuard] },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
];
```
