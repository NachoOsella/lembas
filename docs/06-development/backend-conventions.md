# Backend Conventions

## Module structure

Each backend module follows:

```text
<module>/
  model/       -- JPA entities, enums
  repository/  -- Spring Data JPA repositories
  service/     -- Business logic services
  web/         -- REST controllers
  dto/         -- Request and Response DTOs
  policy/      -- Pure domain logic (no Spring dependencies, testable without context)
  gateway/     -- External integration interfaces (e.g., PaymentGateway)
```

## Module list

| Module | Responsibility |
|---|---|
| auth | JWT authentication, registration, login |
| users | Internal user management (CRUD, enable/disable) |
| catalog | Categories and products |
| inventory | Stock lots, movements, FEFO policy |
| orders | Unified orders (POS and ONLINE) |
| payments | Payment entity, Mercado Pago integration |
| cash | Cash register sessions and movements |
| suppliers | Suppliers and supplier-product associations |
| reports | Dashboard, cash report, recommendations |
| audit | Audit log recording |
| webhooks | External webhook endpoints |
| shared | Common DTOs, exceptions, utilities |

## Controller conventions

- Controllers are thin. Business logic belongs in services.
- Use `@RestController` and `@RequestMapping("/api/<space>/<resource>")`
- Inject services via constructor
- Return DTOs, never JPA entities
- Use `@Valid` for request validation
- Use `@PreAuthorize` for role-based access

```java
@RestController
@RequestMapping("/api/admin/products")
public class ProductAdminController {

    private final ProductService productService;

    public ProductAdminController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PaginatedResponse<ProductSummaryDto>> listProducts(
            @Valid PagedRequest request,
            ProductFilter filter) {
        return ResponseEntity.ok(productService.findAll(filter, request));
    }
}
```

## Service conventions

- Services contain business logic
- Use `@Transactional` for operations that span multiple repository calls
- Services do not return entities directly -- map to DTOs

## Repository conventions

- Extend `JpaRepository` or `PagingAndSortingRepository`
- Use `@Query` with JPQL for complex queries
- Use `@Lock(LockModeType.PESSIMISTIC_WRITE)` for stock operations

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT l FROM StockLot l WHERE l.product.id = :productId AND l.branch.id = :branchId AND l.quantityAvailable > 0 ORDER BY l.expirationDate ASC NULLS LAST")
List<StockLot> findAvailableLotsFifo(@Param("productId") Long productId, @Param("branchId") Long branchId);
```

## Exception conventions

All domain exceptions inherit from `DomainException`:

```java
public abstract class DomainException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public DomainException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
```

## Testing conventions

- Domain policy classes: pure unit tests (no Spring context)
- Repositories: Integration tests with `@DataJpaTest` + Testcontainers
- Controllers: `@WebMvcTest` with mocked services
- Services: Unit tests with mocked repositories
- Use `@SpringBootTest` for full integration tests of critical flows
