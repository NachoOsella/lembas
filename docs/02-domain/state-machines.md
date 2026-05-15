# State Machines

## Order state machine

### ONLINE (e-commerce)

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT
    PENDING_PAYMENT --> PAID
    PENDING_PAYMENT --> PAYMENT_FAILED
    PENDING_PAYMENT --> CANCELLED
    PAID --> PREPARING
    PAID --> STOCK_CONFLICT
    PREPARING --> READY
    READY --> DELIVERED
    PAID --> CANCELLED
    PREPARING --> CANCELLED
    READY --> CANCELLED
    STOCK_CONFLICT --> CANCELLED
    STOCK_CONFLICT --> PAID
    PAYMENT_FAILED --> PENDING_PAYMENT
    CANCELLED --> [*]
    DELIVERED --> [*]
```

### POS (in-store sale)

```mermaid
stateDiagram-v2
    [*] --> PAID
    PAID --> CANCELLED
    CANCELLED --> [*]
```

### Status reference

| Status | Description | Applies to |
|---|---|---|
| PENDING_PAYMENT | Created, waiting for MP payment | ONLINE |
| PAID | Payment confirmed (online) or sale completed (POS) | ONLINE / POS |
| PREPARING | Employee assembling products | ONLINE |
| READY | Ready for customer pickup | ONLINE |
| DELIVERED | Handed to customer at branch (in-store pickup). NOT home delivery. | ONLINE |
| CANCELLED | Order cancelled | ONLINE / POS |
| PAYMENT_FAILED | Payment rejected by MP | ONLINE |
| STOCK_CONFLICT | Payment approved but insufficient stock | ONLINE |

## Payment state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> APPROVED
    PENDING --> REJECTED
    PENDING --> EXPIRED
    PENDING --> CANCELLED
    APPROVED --> REFUNDED
    APPROVED --> CANCELLED
    REJECTED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
    REFUNDED --> [*]
```

### Status reference

| Status | Description |
|---|---|
| PENDING | Payment created, awaiting confirmation |
| APPROVED | Payment confirmed |
| REJECTED | Payment rejected by provider |
| CANCELLED | Payment cancelled |
| REFUNDED | Refunded to customer |
| EXPIRED | Expired without completion |
| IN_PROCESS | In process (Mercado Pago intermediate state) |

## Cash session state machine

```mermaid
stateDiagram-v2
    [*] --> OPEN
    OPEN --> CLOSED
    CLOSED --> [*]
```

## Product online status

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PUBLISHED
    PUBLISHED --> PAUSED
    PAUSED --> PUBLISHED
    PUBLISHED --> HIDDEN
    HIDDEN --> [*]
```

| Status | Description |
|---|---|
| DRAFT | Created, not visible online |
| PUBLISHED | Visible in online store |
| PAUSED | Temporarily hidden |
| HIDDEN | Permanently removed from online catalog |
