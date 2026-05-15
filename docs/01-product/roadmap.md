# Roadmap -- 4 Sprints (MVP)

## Sprint overview

| Sprint | Objective | Stories | Points |
|---|---|---|---:|---:|
| Sprint 1 | Technical foundation, auth, catalog, public store | 12 | 75 |
| Sprint 2 | Stock by lots, online orders, local cart, suppliers, payment base | 12 | 75 |
| Sprint 3 | Mercado Pago, webhook, FEFO online, cash register, POS | 12 | 75 |
| Sprint 4 | Order states, cancellations, reports, audit, security, deployment | 12 | 75 |

## Sprint 1 -- Foundation, auth, catalog

**Goal:** Build the minimum technical and domain foundation: environment, core migrations, authentication, roles, admin catalog, and initial public storefront.

| ID | Epic | Title | Priority | Points |
|---|---|---|---:|---:|---:|
| S1-US01 | EP-00 | Prepare base project structure | High | 5 |
| S1-US02 | EP-00 | Set up Docker Compose local environment | High | 5 |
| S1-US03 | EP-00 | Implement initial Flyway migrations | High | 8 |
| S1-US04 | EP-01 | Register CUSTOMER accounts | High | 5 |
| S1-US05 | EP-01 | Login with JWT | High | 8 |
| S1-US06 | EP-12 | Manage internal users and roles | High | 8 |
| S1-US07 | EP-02 | Manage product categories | Medium | 5 |
| S1-US08 | EP-02 | Manage catalog products | High | 8 |
| S1-US09 | EP-02 | Publish and pause products in store | Medium | 5 |
| S1-US10 | EP-03 | Show initial public catalog | High | 8 |
| S1-US11 | EP-00 | Standardize API errors and validation | High | 5 |
| S1-US12 | EP-00 | Set up testing foundation and demo seed data | Medium | 5 |

## Sprint 2 -- Stock, orders, cart, suppliers

**Goal:** Add real inventory by lots, FEFO, pending-payment online orders, local cart, suppliers, and customer order history.

| ID | Epic | Title | Priority | Points |
|---|---|---|---:|---:|---:|
| S2-US01 | EP-05 | Create stock-by-lot model | High | 8 |
| S2-US02 | EP-05 | Register stock entries | High | 5 |
| S2-US03 | EP-05 | Implement testable FEFO policy | High | 8 |
| S2-US04 | EP-05 | Register manual adjustments and internal consumption | High | 5 |
| S2-US05 | EP-03 | Show real stock availability in store | High | 5 |
| S2-US06 | EP-06 | Create unified order model | High | 8 |
| S2-US07 | EP-09 | Create unified payment base | High | 5 |
| S2-US08 | EP-06 | Create online order (pending payment) | High | 8 |
| S2-US09 | EP-03 | Implement local Angular cart | High | 5 |
| S2-US10 | EP-03 | Complete frontend order confirmation flow | High | 5 |
| S2-US11 | EP-10 | Manage suppliers and manual costs | Medium | 8 |
| S2-US12 | EP-03 | Query customer's own orders | Medium | 5 |

## Sprint 3 -- Mercado Pago, cash register, POS

**Goal:** Complete the main transactional flows: Mercado Pago, webhook, FEFO online deduction, cash register, and in-store POS.

| ID | Epic | Title | Priority | Points |
|---|---|---|---:|---:|---:|
| S3-US01 | EP-04 | Create Mercado Pago adapter | High | 5 |
| S3-US02 | EP-04 | Create Checkout Pro payment preference | High | 5 |
| S3-US03 | EP-04 | Process Mercado Pago webhook with idempotency | High | 8 |
| S3-US04 | EP-05 | Deduct FEFO stock on online payment approval | High | 8 |
| S3-US05 | EP-03 | Integrate frontend checkout with Mercado Pago | High | 5 |
| S3-US06 | EP-07 | Open cash register by branch | High | 8 |
| S3-US07 | EP-07 | Register manual cash movements | Medium | 5 |
| S3-US08 | EP-07 | Close cash register with cash count | High | 5 |
| S3-US09 | EP-08 | Search POS products by name or barcode | Medium | 5 |
| S3-US10 | EP-08 | Create transactional in-store sale | High | 8 |
| S3-US11 | EP-08 | Build complete POS screen | High | 8 |
| S3-US12 | EP-00 | Test critical payment, cash and POS flows | High | 5 |

## Sprint 4 -- Orders, reports, security, deployment

**Goal:** Close backoffice operations and final quality: order states, cancellations, reports, recommendations, audit, security hardening, E2E, demo and documentation.

| ID | Epic | Title | Priority | Points |
|---|---|---|---:|---:|---:|
| S4-US01 | EP-06 | Manage preparation and pickup of online orders | High | 8 |
| S4-US02 | EP-06 | Cancel orders and reverse stock | High | 8 |
| S4-US03 | EP-06 | Manage orders from backoffice | High | 5 |
| S4-US04 | EP-11 | Create daily operational dashboard | Medium | 8 |
| S4-US05 | EP-11 | Generate cash closure report | Medium | 5 |
| S4-US06 | EP-11 | Implement rule-based recommendations | Medium | 8 |
| S4-US07 | EP-00 | Audit critical actions | High | 5 |
| S4-US08 | EP-00 | Harden security, permissions and guards | High | 5 |
| S4-US09 | EP-00 | Improve responsive UX for MVP | Medium | 5 |
| S4-US10 | EP-00 | Cover main E2E flows | High | 8 |
| S4-US11 | EP-00 | Prepare demo deployment | High | 5 |
| S4-US12 | EP-00 | Finalize academic documentation and Jira evidence | Medium | 5 |

## Recommended implementation order per sprint

1. Database migrations and entities first
2. Domain services with unit tests
3. Controllers/endpoints with integration tests
4. Angular screens, guards, interceptors and UX validations
5. Close each sprint with an integrated demo

## Risks by sprint

| Risk | Control | Sprint |
|---|---|---|
| Scope creep from post-MVP features | Keep out of sprint backlog | All |
| Overselling from POS + webhook concurrency | SELECT FOR UPDATE on stock_lots | 2-3 |
| Duplicate MP webhook double-deducting | Idempotency by provider_payment_id | 3 |
| Cash register misinterpreted as control over all methods | Count only cash; other methods are informational | 3-4 |
| Role confusion between CUSTOMER and internal users | branch_id required for internal users; separate route spaces | 1-4 |
| Heavy reports blocking daily operations | Paginated queries and limited dashboard scope | 4 |
