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
```

## Module list

| Module | Responsibility |
|---|---|
| auth | JWT authentication, registration, login |
| users | Internal user management (CRUD, enable/disable) |
| catalog | Categories and products, pricing rules |
| content | Public legal content (Terms and Conditions, FAQ), no persistence |
| inventory | Stock lots, movements, FEFO deduction, purchase receipt entry |
| orders | Unified orders (POS and ONLINE), state machine, cancellation |
| payments | Payment entity, Mercado Pago integration, Mercado Pago webhook endpoint |
| cash | Cash register sessions and movements |
| pos | In-store POS product search and transactional sale creation |
| suppliers | Suppliers, supplier-product associations, purchase orders, receipts, price update batches |
| reports | Dashboard, cash report, sales/employees/inventory/suppliers reports, recommendations |
| audit | Audit log recording |
| shared | Common DTOs, exceptions, utilities, branch management, security configuration |

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

- Services contain business logic, including domain rules such as FEFO and cash-close calculations
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

Business-rule failures use `DomainException` with a stable error code and HTTP status:

```java
public class DomainException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public DomainException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
```

Prefer throwing `DomainException` directly unless a dedicated subclass adds real behavior. Keep error codes documented in `docs/05-api/api-guidelines.md` and map frontend messages by code.

## Testing conventions

- Repositories: Integration tests with `@DataJpaTest` + Testcontainers
- Controllers: `@WebMvcTest` with mocked services
- Services: Unit tests with mocked repositories
- Use `@SpringBootTest` for full integration tests of critical flows
