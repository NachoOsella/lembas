# Domain Model

## Core principle

This is **not** two separate systems. The backoffice (ERP) and the online store (e-commerce) share a single commercial core. Orders, payments, products, stock, and customers are unified entities.

## Conceptual structure

```
Dietetica Lembas
├── Global catalog
│   ├── Products, categories
│   └── Sale price (on the product)
├── Branches
│   ├── Stock by lots with expiration dates
│   ├── Stock movements (traceability)
│   ├── In-store sales (orders with type=POS)
│   └── Online order preparation (orders with type=ONLINE)
└── Unified payments
    ├── Online payments (Mercado Pago Checkout Pro)
    └── In-store payments (associated with cash register)
```

## Entity relationship diagram

```mermaid
erDiagram
    BRANCH ||--o{ STOCK_LOT : contains
    BRANCH ||--o{ ORDER : registers
    BRANCH ||--o{ USER : assigns
    BRANCH ||--o{ STOCK_MOVEMENT : registers
    BRANCH ||--o{ CASH_SESSION : opens_closes
    PRODUCT ||--o{ STOCK_LOT : has_lots
    PRODUCT ||--o{ STOCK_MOVEMENT : moves
    PRODUCT ||--o{ ORDER_ITEM : sold_in
    PRODUCT ||--o{ PRODUCT_PROMOTION : promotes
    PRODUCT ||--o{ SUPPLIER_PRODUCT : supplied_by
    PRODUCT }o--|| CATEGORY : belongs_to
    SUPPLIER ||--o{ SUPPLIER_PRODUCT : offers
    USER ||--o{ STOCK_MOVEMENT : registers
    USER ||--o{ ORDER : as_creator
    USER ||--o{ ORDER : as_customer
    USER ||--o{ CASH_SESSION : operator
    USER ||--o{ CASH_MOVEMENT : registers
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ PAYMENT : has_payments
    ORDER }o--|| BRANCH : belongs_to
    CASH_SESSION ||--o{ PAYMENT : contains_payments
    CASH_SESSION ||--o{ CASH_MOVEMENT : contains_movements
```

## Domain decisions

| Decision | Rationale |
|---|---|
| Available stock = SUM(stock_lots.quantity_available) | Stock lots are the single source of truth. No denormalized stock cache |
| Stock movements serve as traceability | Every stock change generates a record. No silent updates |
| Online and in-store sales share the Order entity | Channel is distinguished by `type` (ONLINE vs POS). Same business rules apply |
| Online and in-store payments share the Payment entity | Shared table for consistent reporting and traceability |
| Cash register controls physical cash only | Other payment methods (QR, transfer, cards) are informational at close time |
| Product snapshots in order items | Ensures accurate historical reports even if prices change later |
| Stock deducted at payment confirmation, not at order creation | No separate reservation table needed. Reversal uses cancellation movements |
