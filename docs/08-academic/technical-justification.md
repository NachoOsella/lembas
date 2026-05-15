# Technical Justification

## Architecture decisions

### Why modular monolith?

| Criterion | Monolith | Microservices |
|---|---|---|
| Development speed (1 developer) | Fast | Slow (infrastructure overhead) |
| Debugging | Simple | Complex (distributed tracing) |
| Deployment | One artifact | Multiple services |
| Testing | Simple integration tests | Complex contract tests |
| Scalability | Vertical | Horizontal |
| Learning curve for thesis | Low | High |

The modular monolith provides domain separation through package structure without the operational complexity of microservices. If the system ever needs microservices, each module can be extracted independently.

### Why PostgreSQL?

- Strong transaction support (required for FEFO stock operations)
- Mature JPA/Hibernate integration
- JSONB support for flexible metadata (payment webhook data)
- CHECK constraints for data integrity
- Testcontainers for integration testing

### Why Angular?

- Strong typing with TypeScript
- Signals for reactive state management (simpler than RxJS-only approaches)
- Standalone components (modern Angular, no NgModules needed)
- PrimeNG provides production-ready backoffice components (tables, dialogs, forms)

### Why Mercado Pago Checkout Pro?

- Most widely used payment gateway in Argentina
- Hosted checkout reduces PCI compliance scope
- Webhook-based notification model fits async order processing
- Sandbox environment for development and testing

## Domain decisions

### Unified order model

Combining POS and ONLINE orders in a single table:
- Eliminates duplicated business logic
- Enables cross-channel reporting
- Simplifies stock deduction (same FEFO logic for both channels)
- Channel distinguished by a single `type` field

### Stock lots as source of truth

No denormalized stock counts:
- Eliminates synchronization issues
- Built-in FEFO ordering
- Full lot traceability
- Cancellation reverses to the exact same lots

### Cash register design

The cash register only physically counts cash because:
- In small stores, cash is the only payment method that physically resides in the drawer
- QR, transfer, and card payments go directly to the business bank account
- The closing report shows all methods but only reconciles cash
- This matches real small-store operations

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Overselling from concurrent POS + webhook | Pessimistic locking (SELECT FOR UPDATE) on stock_lots |
| Duplicate MP webhook | Idempotency by provider_payment_id |
| Cash discrepancy disputes | Mandatory reason, both opener and closer recorded |
| Role confusion | Separate route spaces (/api/customer/ vs /api/admin/) |
| Scope creep | Explicit out-of-scope document, ADR for every deferral |
