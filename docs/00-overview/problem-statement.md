# Problem Statement

## Current situation

Dietetica Lembas is a small-to-medium health food store that sells natural products, cereals, supplements, and organic groceries. The business currently operates with several disconnected tools and manual processes:

### Pain points

| Problem | Impact |
|---|---|
| Stock is tracked on paper and spreadsheets | No real-time availability; frequent stockouts and over-ordering |
| No lot tracking with expiration dates | High product waste; cannot implement FEFO; customers may receive nearly-expired products |
| POS system is isolated | In-store sales do not feed into any central inventory or reporting system |
| No online store | Lost customers who expect to order online; no digital presence |
| No unified customer view | Cannot track customer purchase history or preferences |
| Cash management is manual | No reliable way to reconcile expected cash vs actual cash at end of shift |
| No actionable reporting | Cannot identify slow-moving products, near-expiry items, or daily sales trends |
| Supplier cost tracking is ad-hoc | No structured way to compare supplier prices or track cost history |

### Scale

The business operates with:
- 1 branch initially (expandable to multiple branches)
- Approximately 15-20 active product categories
- 200-500 SKUs depending on season
- 3-5 employees per shift
- A growing online customer base

## Why a custom system?

Off-the-shelf solutions were considered:

| Option | Issue |
|---|---|
| Generic POS + WooCommerce | Two separate systems; no unified stock; integration complexity |
| SaaS ERP | Monthly cost is prohibitive for a small business; vendor lock-in |
| Spreadsheets + manual processes | Does not scale; error-prone; no real-time data |

A custom system provides:
- Tailored FEFO stock management for perishable products
- Unified offline-first POS and online order model
- Cash register logic matching real small-store operations
- Full control over features and future expansion

## Success criteria

The system is considered successful when:

1. An administrator can manage products, stock, and pricing from a single interface
2. An employee can open the cash register, make sales, and close the register with cash count verification
3. A customer can browse products online, pay with Mercado Pago, and pick up at the store
4. Stock is automatically deducted using FEFO when payment is confirmed
5. Stock and sales reports are available without manual data entry
