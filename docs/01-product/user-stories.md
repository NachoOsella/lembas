# User Stories (MVP)

48 user stories organized in 4 two-week sprints. Each story includes acceptance criteria and technical sub-tasks. Estimation in story points (total: 300).

Full detailed content with acceptance criteria for each story is available in the Spanish documentation (`06 - Planificacion/User Stories.md`). This document provides the summary-level reference.

## Sprint 1 -- Foundation, auth, catalog

**Goal:** Build the minimum technical and domain foundation.
**Stories:** 12 | **Points:** 75

| Story | Epic | Title | Points |
|---|---|---|---|
| S1-US01 | EP-00 | Prepare base project structure | 5 |
| S1-US02 | EP-00 | Set up Docker Compose local environment | 5 |
| S1-US03 | EP-00 | Implement initial Flyway migrations | 8 |
| S1-US04 | EP-01 | Register CUSTOMER accounts | 5 |
| S1-US05 | EP-01 | Login with JWT | 8 |
| S1-US06 | EP-12 | Manage internal users and roles | 8 |
| S1-US07 | EP-02 | Manage product categories | 5 |
| S1-US08 | EP-02 | Manage catalog products | 8 |
| S1-US09 | EP-02 | Publish and pause products in store | 5 |
| S1-US10 | EP-03 | Show initial public catalog | 8 |
| S1-US11 | EP-00 | Standardize API errors and validation | 5 |
| S1-US12 | EP-00 | Set up testing foundation and demo seed data | 5 |

## Sprint 2 -- Stock, orders, cart, suppliers

**Goal:** Add inventory, online orders, cart, and suppliers.
**Stories:** 12 | **Points:** 75

| Story | Epic | Title | Points |
|---|---|---|---|
| S2-US01 | EP-05 | Create stock-by-lot model | 8 |
| S2-US02 | EP-05 | Register stock entries | 5 |
| S2-US03 | EP-05 | Implement FEFO stock deduction | 8 |
| S2-US04 | EP-05 | Register manual adjustments and internal consumption | 5 |
| S2-US05 | EP-03 | Show real stock availability in store | 5 |
| S2-US06 | EP-06 | Create unified order model | 8 |
| S2-US07 | EP-09 | Create unified payment base | 5 |
| S2-US08 | EP-06 | Create online order (pending payment) | 8 |
| S2-US09 | EP-03 | Implement local Angular cart | 5 |
| S2-US10 | EP-03 | Complete frontend order confirmation flow | 5 |
| S2-US11 | EP-10 | Manage suppliers and manual costs | 8 |
| S2-US12 | EP-03 | Query customer's own orders | 5 |

## Sprint 3 -- Mercado Pago, cash register, POS

**Goal:** Complete transactional flows.
**Stories:** 12 | **Points:** 75

| Story | Epic | Title | Points |
|---|---|---|---|
| S3-US01 | EP-04 | Create Mercado Pago payment service | 5 |
| S3-US02 | EP-04 | Create Checkout Pro payment preference | 5 |
| S3-US03 | EP-04 | Process Mercado Pago webhook with idempotency | 8 |
| S3-US04 | EP-05 | Deduct FEFO stock on online payment approval | 8 |
| S3-US05 | EP-03 | Integrate frontend checkout with Mercado Pago | 5 |
| S3-US06 | EP-07 | Open cash register by branch | 8 |
| S3-US07 | EP-07 | Register manual cash movements | 5 |
| S3-US08 | EP-07 | Close cash register with cash count | 5 |
| S3-US09 | EP-08 | Search POS products by name or barcode | 5 |
| S3-US10 | EP-08 | Create transactional in-store sale | 8 |
| S3-US11 | EP-08 | Build complete POS screen | 8 |
| S3-US12 | EP-00 | Test critical payment, cash and POS flows | 5 |

## Sprint 4 -- Orders, reports, security, deployment

**Goal:** Close backoffice operations and final quality.
**Stories:** 12 | **Points:** 75

| Story | Epic | Title | Points |
|---|---|---|---|
| S4-US01 | EP-06 | Manage preparation and pickup of online orders | 8 |
| S4-US02 | EP-06 | Cancel orders and reverse stock | 8 |
| S4-US03 | EP-06 | Manage orders from backoffice | 5 |
| S4-US04 | EP-11 | Create daily operational dashboard | 8 |
| S4-US05 | EP-11 | Generate cash closure report | 5 |
| S4-US06 | EP-11 | Implement rule-based recommendations | 8 |
| S4-US07 | EP-00 | Audit critical actions | 5 |
| S4-US08 | EP-00 | Harden security, permissions and guards | 5 |
| S4-US09 | EP-00 | Improve responsive UX for MVP | 5 |
| S4-US10 | EP-00 | Cover main E2E flows | 8 |
| S4-US11 | EP-00 | Prepare demo deployment | 5 |
| S4-US12 | EP-00 | Finalize academic documentation and Jira evidence | 5 |
