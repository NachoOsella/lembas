# Glossary

| Term | Definition |
|---|---|
| ArchUnit | A Java testing library for asserting architectural rules (module boundaries, layer access) at build time |
| Backoffice | Internal admin area used by administrators and employees to manage the business |
| Branch (Sucursal) | A physical store location. Each branch has its own stock, employees, and cash register |
| Cash Register (Caja) | An operational session for in-store sales. Opened at shift start, closed at shift end |
| Cash Count (Arqueo) | The physical counting of cash when closing a register, compared against expected amount |
| Catalog | The set of products visible in the online store |
| Checkout | The order confirmation process. Requires CUSTOMER authentication |
| Checkout Pro | Mercado Pago's hosted payment page to which the customer is redirected |
| Customer | A registered user with CUSTOMER role who can purchase online |
| FEFO | First Expired, First Out. Stock deduction strategy that prioritizes lots with closest expiration dates |
| Lot | A batch of stock units sharing the same expiration date, identified by a lot code |
| Mercado Pago | Argentine payment provider used for online purchases |
| Modular Monolith | A single deployable application organized by domain modules, avoiding microservice complexity |
| Payment Preference | The payment configuration created in Mercado Pago for a specific order |
| PICKUP | The only fulfillment method in MVP -- customer picks up at the branch |
| POS | Point of Sale. The in-store sales interface used by employees |
| Price Update Batch | A reviewed batch for updating supplier replacement costs and product sale prices from a supplier file or manual entry |
| Public API Contract | A module's owned `api/` package that other modules may call; the only allowed cross-module dependency path |
| Purchase Order | An intent to buy from a supplier; does not affect stock |
| Purchase Receipt | Real merchandise arrival confirmation; creates stock lots and movements |
| Snapshot | Data captured at order creation time (product name, price, cost) stored permanently in order items |
| Stock Movement | A traceable record of any stock change (entry, sale, adjustment, cancellation, waste) |
| Webhook | HTTP callback from Mercado Pago to the backend when a payment status changes |
