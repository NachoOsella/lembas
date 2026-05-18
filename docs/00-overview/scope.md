# Project Scope

## In scope (MVP)

### Authentication and users

- Customer registration (CUSTOMER role)
- Login with JWT
- Internal user management (ADMIN, MANAGER, EMPLOYEE)
- Role-based access control

### Catalog and products

- Category tree management
- Full product CRUD with barcode, brand, price, image
- Online publication status (DRAFT, PUBLISHED, PAUSED, HIDDEN)
- Public product catalog with search and category filtering

### Online store

- Local shopping cart (localStorage in browser)
- Checkout with registered CUSTOMER account
- Payment via Mercado Pago Checkout Pro
- Order status tracking for customers
- Pickup at branch only (PICKUP)

### Stock and inventory

- Stock by lot with expiration dates
- Stock movements with full traceability
- FEFO (First Expired, First Out) stock deduction
- Stock entry and manual adjustments
- Expiry and low-stock alerts

### In-store sales (POS)

- Fast product search by name and barcode
- Multi-method payment (cash, QR, transfer, debit, credit)
- FEFO stock deduction at time of sale
- Open cash register required

### Cash register

- Cash session opening with initial cash amount
- Manual movements during shift (cash in, cash out, adjustments)
- Cash session closing with expected vs counted cash
- Discrepancy justification (mandatory if difference exists)

### Payments (unified)

- Single payment table for online and in-store payments
- Payment providers: MERCADO_PAGO, MANUAL, BANK, CARD_TERMINAL
- Payment methods: CHECKOUT_PRO, CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD
- Payment statuses: PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED, EXPIRED

### Suppliers

- Supplier registry with contact info and CUIT
- Product-supplier association with manual cost entry
- Preferred supplier flag

### Reports

- Daily operational dashboard
- Cash closure report with totals by payment method
- Rule-based recommendations (low stock, expiring soon, high rotation, no movement)

### Audit

- Audit logs for critical actions (price changes, stock adjustments, cancellations, cash operations)

## Explicitly out of scope (MVP)

| Feature | Reason |
|---|---|
| Home delivery | Only branch pickup. Delivery requires address management, cost calculation, and logistics integration. |
| Fiscal invoicing (AFIP/ARCA) | Exceeds academic scope. Requires tax knowledge, system homologation, and fiscal keys. |
| Mobile native app | Duplicates effort. Web frontend is responsive. |
| Multi-company / multi-tenant | Single business. Branch support is built in. |
| Automatic supplier price import | Requires variable format parsing and approval workflow. Manual entry in MVP. |
| Persistent server-side cart | localStorage is sufficient for the MVP use case. |
| Notifications (email, WhatsApp, push) | Order tracking is pull-based (customer checks status). |
| AI / LLM chatbot | Recommendations are rule-based. Avoids hallucination and infrastructure complexity. |
| Coupons and complex promotions | Only per-product discounts in MVP. |
| Guest checkout | ADR-039: online purchase requires registered customer. |
| Multi-language / multi-currency | Single local market (Argentina, ARS). |
| Branch-to-branch stock transfers | Single branch in MVP. |
| Multiple product images | Single image URL per product. |
| Brands as separate table | brand_name stored as text field in product. |

## Post-MVP roadmap

| Horizon | Features |
|---|---|
| Short-term | Home delivery (manual), persistent cart, coupons, email notifications, multiple product images, branch transfers |
| Medium-term | Rappi/PedidosYa integration, fiscal invoicing, automatic price import, PWA/mobile app, guest checkout |
| Long-term | Multi-company, multi-currency, AI chatbot, loyalty programs, accounting system integration |
