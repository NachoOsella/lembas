# Out of Scope (MVP)

This document details what is explicitly excluded from the MVP and why. Each item is a conscious decision documented in the Architecture Decision Records (ADR).

| Feature | Reason | ADR |
|---|---|---|
| Home delivery | Pickup only. Requires address management, cost calculation, logistics integration | ADR-040 |
| Rappi / PedidosYa integration | Post-MVP logistics platform integration | ADR-006 |
| Fiscal invoicing (AFIP/ARCA) | Exceeds academic scope. Tax knowledge, homologation, fiscal keys | ADR-005 |
| Mobile native app (Android/iOS) | Duplicates effort. Web frontend is responsive | -- |
| Multi-company / multi-tenant | Single business (Dietetica Lembas). Branches are supported | ADR-024 |
| Automatic supplier price import | Each supplier has different format. Manual entry in MVP | ADR-018 |
| AI / LLM chatbot | Rule-based recommendations only. Avoids hallucination and infrastructure | ADR-008 |
| Coupons and complex promotions | Per-product discounts only in MVP | ADR-017 |
| Guest checkout | Online purchase requires registered customer | ADR-039 |
| Multi-language / multi-currency | Single local market (Argentina, ARS) | -- |
| Branch-to-branch stock transfers | Single branch in MVP | -- |
| Multiple product images | Single image URL per product | ADR-019 |
| Brands as separate table | brand_name stored as text in product | -- |
| Server-side persisted cart | localStorage is sufficient for MVP | ADR-041 |
| Notifications (email, WhatsApp, SMS) | Order tracking is pull-based (customer checks status) | -- |
| Persistent label printing | PDF under demand, without persistence | ADR-027 |
| Complex barcode generation | Barcode stored as text, printed via label | -- |
| Loyalty / points programs | Post-MVP | -- |

## Why these decisions matter

Every exclusion is documented so that:

1. The tutor understands what was intentionally deferred and why
2. The AI agent does not attempt to implement features outside MVP scope
3. Future development has clear guidance on what can be added and how
