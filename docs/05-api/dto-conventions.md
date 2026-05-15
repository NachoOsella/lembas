# DTO Conventions

## Naming

| DTO type | Suffix | Example |
|---|---|---|
| API request | `Request` | `CreateProductRequest` |
| API response (summary) | `Dto` or `SummaryDto` | `ProductSummaryDto` |
| API response (detail) | `DetailDto` or `Dto` | `ProductDetailDto` |
| Paginated response | Standard wrapper | `PaginatedResponse<T>` |
| Created response | `CreatedDto` | `OrderCreatedDto` |

## Package location

DTOs belong to the module they are used in, typically in a `dto` sub-package:

```text
orders/
  dto/
    CreateOnlineOrderRequest.java
    OrderSummaryDto.java
    OrderDetailDto.java
    OrderCreatedDto.java
```

Shared/DTOs that cross module boundaries go in:

```text
shared/
  dto/
    ApiError.java
    PaginatedResponse.java
    PagedRequest.java
```

## Principles

1. **Never expose JPA entities directly in API responses.** Always map to DTOs.
2. **Request DTOs should use Jakarta Validation annotations** (`@NotBlank`, `@NotNull`, `@Positive`, `@Email`, `@Size`).
3. **Response DTOs should be immutable** (use Java records or classes with only getters).
4. **DTOs should not contain business logic.**
5. **Use `@JsonInclude(Include.NON_NULL)`** on response DTOs to omit null fields.

## Example: Product DTOs

```java
// Request
public record CreateProductRequest(
    @NotBlank String name,
    String description,
    String brandName,
    String barcode,
    @NotNull Long categoryId,
    @NotNull @Positive BigDecimal salePrice,
    String onlineStatus,
    String imageUrl,
    Integer minimumStock
) {}

// Summary response
public record ProductSummaryDto(
    Long id,
    String name,
    String barcode,
    String brandName,
    BigDecimal salePrice,
    String onlineStatus,
    String imageUrl,
    BigDecimal availableStock,
    Long categoryId,
    String categoryName
) {}

// Detail response
public record ProductDetailDto(
    Long id,
    String name,
    String description,
    String brandName,
    String barcode,
    Long categoryId,
    String categoryName,
    BigDecimal salePrice,
    String onlineStatus,
    String imageUrl,
    BigDecimal availableStock,
    Integer minimumStock,
    Boolean active,
    Instant createdAt,
    Instant updatedAt
) {}
```

## Paginated response

```java
public record PaginatedResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {}
```

## ApiError

```java
public record ApiError(
    int status,
    String code,
    String message,
    Object details,
    Instant timestamp,
    String path
) {}
```
