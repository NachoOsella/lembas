# Testing Strategy

## Testing levels

| Level | Scope | Tool | Speed |
|---|---|---|---|
| Unit | Services and helper methods (isolated) | JUnit 5 + Mockito | Fast |
| Integration | Repositories, database interactions | Testcontainers | Medium |
| Controller | HTTP endpoints, serialization, security | @WebMvcTest | Medium |
| Full integration | Multi-service critical flows (FEFO, POS, webhook, cancellation, cash) | @SpringBootTest + Testcontainers | Medium |
| Architecture | Module boundary and dependency rules | ArchUnit | Fast |
| E2E | Not yet configured in MVP (see limitation below) | -- | -- |

## Backend testing

### Unit tests

Test services and helper methods in isolation with mocked dependencies:

- FEFO stock deduction logic
- Cash close expected amount and discrepancy calculation
- Order number generation, state transitions

### Integration tests

Test database interactions with Testcontainers:

```java
@SpringBootTest
@Testcontainers
class StockLotRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private StockLotRepository stockLotRepository;

    @Test
    void shouldReturnAvailableLotsOrderedByExpiration() {
        // Test FEFO ordering at repository level
    }
}
```

### Controller tests

Test HTTP layer with mocked services:

```java
@WebMvcTest(ProductAdminController.class)
class ProductAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void shouldReturn200WhenListingProducts() throws Exception {
        mockMvc.perform(get("/api/admin/products")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());
    }
}
```

### Critical flows to test

| Flow | Test type | What to verify |
|---|---|---|
| CUSTOMER registration | Integration | Email unique, BCrypt hash, branch_id null |
| JWT authentication | Controller | Token generation, invalid credentials, disabled account |
| Product CRUD | Controller | Validation, barcode unique, status transitions |
| FEFO deduction | Unit | Single lot, multiple lots, null expiration, insufficient stock |
| Stock entry | Integration | Lot creation, movement generation, available calculation |
| Online order creation (stock validation) | Integration | Buying more than available is rejected (INSUFFICIENT_STOCK) |
| Online order creation (success) | Integration | PENDING_PAYMENT status, snapshot capture, payment creation |
| MP webhook approval | Integration | Transactional FEFO deduction, idempotency, order status change |
| MP webhook duplicate | Integration | Second call returns 200 without side effects |
| MP webhook approved but no stock | Integration | Order goes to STOCK_CONFLICT, no stock deducted |
| MP webhook rejected | Integration | Order goes to PAYMENT_FAILED, no stock deducted |
| Concurrent stock contention | Integration | Two simultaneous buyers for last unit -- only one succeeds (FOR UPDATE) |
| POS sale (with open register) | Integration | FEFO deduction, order creation, payment with cash_session_id |
| POS sale (without open register) | Integration | Rejected with CASH_SESSION_REQUIRED |
| Cash register close (no discrepancy) | Integration | Expected cash calculated correctly, session closed |
| Cash register close (discrepancy, no reason) | Integration | Rejected with DIFFERENCE_REASON_REQUIRED |
| Cash register close (discrepancy with reason) | Integration | Accepted, discrepancy audited |
| Order cancellation (paid order) | Integration | Stock reversed to correct lots, payment CANCELLED |
| Order cancellation (pending payment) | Integration | No stock action, payment CANCELLED |
| CUSTOMER tries to open cash register | Controller | 403 FORBIDDEN |
| EMPLOYEE closes with discrepancy | Integration | Reason mandatory, discrepancy logged |
| Two open sessions on same branch | Integration | Second open rejected (CASH_SESSION_ALREADY_OPEN) |
| Dashboard query | Controller | Correct aggregation, role-based filtering |
| Recommendations | Unit | Rules fire correctly for low stock, expiring, rotation, no movement |
| Error format | Controller | ApiError structure, VALIDATION_ERROR details |

## Frontend testing

### Unit tests (Vitest 4 + jsdom 28)

- **Components**: rendering, user interaction, state display (via TestBed)
- **Services**: HTTP calls, data transformation, error handling
- **Guards**: authentication state, role-based access
- **Interceptors**: token attachment, error mapping
- **Specs**: use `describe/it/expect` with Vitest, standalone component imports through TestBed

### What to test

| Component | Test cases |
|---|---|
| ProductListComponent | Loading state, empty state, error state, data display, pagination, search filter |
| ProductFormComponent | Validation errors, successful save, server errors |
| CartService | Add item, remove item, quantity update, total calculation, localStorage persistence |
| AuthGuard | Authenticated access, unauthenticated redirect, role check |
| HttpErrorInterceptor | 401 redirect, 403 forbidden, 409 conflict message, 500 generic error |
| CashCloseComponent | Expected cash calculation display, discrepancy validation, close confirmation |

### E2E testing (deferred)

E2E testing with a dedicated framework (Playwright, Cypress, or Vitest-based integration) is not yet configured in the MVP. The critical user flows listed below are covered by the combination of `@SpringBootTest` integration tests (backend) and Vitest component/service tests (frontend), which together validate every transition in each flow. A dedicated E2E suite is a post-MVP improvement.

Critical flows covered by integration tests:

- Customer registration -> browse catalog -> add to cart -> checkout -> view order
- Employee login -> open cash register -> POS sale -> close register
- Admin login -> create product -> publish -> view in store
- Admin -> process order (prepare, ready, deliver)
- Admin -> cancel order -> verify stock reversal

## Test data

- Seed data with realistic products (15-20 items), categories, lots
- Demo users: admin, manager, employee, customer
- Demo branch: "Centro" (primary branch)
- Mock Mercado Pago calls in automated tests (using mocked HTTP responses, not a sandbox)
