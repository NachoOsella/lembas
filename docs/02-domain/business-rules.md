# Business Rules

## Products

- A product can be active or inactive
- Only active products with online_status = PUBLISHED appear in the online store
- A product belongs to exactly one category (optional)
- barcode is unique when provided
- sale_price must be >= 0
- online_status transitions: DRAFT -> PUBLISHED -> PAUSED -> HIDDEN (and back)
- A product can exist without any stock (zero stock = not available online)
- Minimum stock alerts are based on `minimum_stock` field

## Branches

- The system supports multiple branches from the domain base, even if the business has one initially
- Every stock operation must be associated with a branch
- Every order must be associated with a branch
- Products are global (same product sold at all branches)
- Stock is per-branch (each branch has its own lots)

## Users

- Customers must register to purchase online (no guest checkout)
- CUSTOMER role has branch_id = null
- MANAGER and EMPLOYEE roles require a branch_id
- ADMIN can access all branches and features
- Passwords are stored with BCrypt hashing
- JWT tokens expire after 24 hours

## Orders

- An order must have at least one item
- An order must be associated with a branch
- ONLINE orders require customer_user_id (registered CUSTOMER)
- POS orders require created_by_user_id (internal employee)
- ONLINE orders start as PENDING_PAYMENT
- POS orders are created as PAID (same status, used for completed in-store sales)
- POS orders require an open cash register in the branch
- Stock is validated at order creation and re-validated at payment confirmation
- Order items store snapshots of product name, barcode, price, and cost at time of sale

## Stock

- Available stock = SUM(quantity_available) from stock_lots
- Stock is deducted using FEFO (First Expired, First Out) when expiration dates exist
- Lots without expiration dates are consumed after all dated lots
- Negative stock is never allowed (constraint enforced at database level)
- Every stock change generates a StockMovement record
- Stock movements cannot be deleted or modified
- Manual adjustments require a mandatory reason

## Payments

- Every order must have at least one associated payment
- Online payments use MERCADO_PAGO provider with CHECKOUT_PRO method
- In-store payments use MANUAL provider with the selected method (CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD)
- In-store payments must be associated with an open cash session
- No sensitive card data is stored in the system
- Mercado Pago integration is behind a PaymentGateway interface for testability

## Cash Register

- Only one open cash session per branch at a time
- An open cash session is required to make in-store sales
- The cash register controls physical cash. Other payment methods are informational
- At closing: expected cash = opening amount + cash sales + cash movements
- If counted cash differs from expected cash, a reason is mandatory
- The cash register closes even if there is a discrepancy (the discrepancy is logged)
- Any authorized employee can open or close a cash register
- If the closing employee is not the same person who opened, both users are recorded

## Reports and Recommendations

- Recommendations are rule-based, not AI-generated
- Rule types: LOW_STOCK, EXPIRING_SOON, HIGH_ROTATION, NO_MOVEMENT
- The dashboard shows only current-day data
- Cash closure reports show totals by payment method, with cash count verification

## Audit

- Critical actions are logged in audit_logs with user, timestamp, and description
- Logged events: price changes, stock adjustments, order cancellations, cash operations
- Audit logs are append-only (no deletion or modification)
