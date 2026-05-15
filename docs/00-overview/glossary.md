# Glossary

| Term | Definition |
|---|---|
| Backoffice | Internal admin area used by administrators and employees to manage the business |
| Branch (Sucursal) | A physical store location. Each branch has its own stock, employees, and cash register |
| Cash Register (Caja) | An operational session for in-store sales. Opened at shift start, closed at shift end |
| Cash Count (Arqueo) | The physical counting of cash when closing a register, compared against expected amount |
| Catalog | The set of products visible in the online store |
| Checkout | The order confirmation process. Requires CUSTOMER authentication |
| Checkout Pro | Mercado Pago's hosted payment page to which the customer is redirected |
| Customer | A registered user with CUSTOMER role who can purchase online |
| FEFO | First Expired, First Out. Stock deduction policy that prioritizes lots with closest expiration dates |
| Lot | A batch of stock units sharing the same expiration date, identified by a lot code |
| Mercado Pago | Argentine payment gateway used for online purchases |
| Modular Monolith | A single deployable application organized by domain modules, avoiding microservice complexity |
| Payment Preference | The payment configuration created in Mercado Pago for a specific order |
| PICKUP | The only fulfillment method in MVP -- customer picks up at the branch |
| POS | Point of Sale. The in-store sales interface used by employees |
| Snapshot | Data captured at order creation time (product name, price, cost) stored permanently in order items |
| Stock Movement | A traceable record of any stock change (entry, sale, adjustment, cancellation, waste) |
| Webhook | HTTP callback from Mercado Pago to the backend when a payment status changes |
