# Coding Standards

## General principles

- Write code in English (classes, variables, methods, comments)
- Follow the principle of least surprise
- Favor readability over cleverness
- No commented-out code
- Keep methods small (aim for < 30 lines)
- One class = one responsibility

## Java (backend)

### Naming conventions

| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `ProductService`, `StockDeductionService` |
| Interfaces | PascalCase | `PaymentClient` |
| Methods | camelCase | `createPreference()`, `deductStock()` |
| Variables | camelCase | `availableStock`, `totalAmount` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Enums | PascalCase (values: UPPER_SNAKE_CASE) | `PaymentStatus.APPROVED` |
| Packages | lowercase | `com.dietetica.orders` |

### Code style

- Indentation: 4 spaces (no tabs)
- Opening brace on same line
- JPA entities: use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
- Records for DTOs where possible
- `@Autowired` on constructor injection (no field injection)

### Package structure

```text
com.dietetica.<module>/
  model/       -- JPA entities, enums
  repository/  -- Spring Data repositories
  service/     -- Business logic
  web/         -- REST controllers
  dto/         -- Request/Response DTOs
```

### Testing

- Unit tests for services and complex helper methods
- Integration tests with Testcontainers for repositories
- Controller tests with `@WebMvcTest`
- Use descriptive test method names: `shouldDeductFromExpiringLotFirst()`

## TypeScript / Angular (frontend)

### Naming conventions

| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `ProductService`, `AuthGuard` |
| Interfaces | PascalCase (prefix I is optional) | `CartItem`, `ProductDto` |
| Methods | camelCase | `getItems()`, `loadFromStorage()` |
| Variables | camelCase | `availableStock`, `totalAmount` |
| Constants | UPPER_SNAKE_CASE | `LOCAL_STORAGE_KEY` |
| Files | kebab-case | `product-list.component.ts` |
| Components | PascalCase class, kebab-case selector | `ProductListComponent`, `app-product-list` |

### Component structure

```text
feature/
  product-list/
    product-list.component.ts
    product-list.component.html
    product-list.component.css
    product-list.component.spec.ts
```

### State management

- Use Angular Signals for reactive state
- No NgRx or other state management libraries
- `signal()` for simple state
- `computed()` for derived state
- `effect()` for side effects (sparingly)

### Testing

- Jasmine + Karma for unit tests
- Test components, services, guards, and interceptors
- Mock HTTP calls with `HttpClientTestingController`
- Test all states: loading, empty, error, success

## Database (SQL)

- Table names: snake_case, plural (`stock_lots`, `order_items`)
- Primary keys: `id` (BIGSERIAL)
- Foreign keys: `entity_id` (`product_id`, `branch_id`)
- Audit fields: `created_at`, `updated_at`
- Use CHECK constraints for enum-like columns
- Indexes on foreign keys and frequently queried columns
- All migrations via Flyway (no manual DDL)
