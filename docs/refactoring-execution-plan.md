# Modular Monolith Refactoring: Completion and Deferred Work

## Purpose

This document records the completed local refactoring scope and preserves only the two user-deferred follow-up phases: external infrastructure validation and thesis-grade academic documentation.

Use Git history and `docs/ai-usage-log.md` for detailed implementation history.

## Current State

- Working branch: `refactor/modular-architecture`
- Base commit for migration integrity: `3afdcab47`
- Refactoring checkpoint: `a8a8d751f`
- Pushes performed: none
- Working tree: contains intentional uncommitted refactoring changes
- Frontend clean-install and integrated gates: passed
  - Boundaries, Prettier, ESLint, application/spec typechecks, 986 tests, production build, and production dependency audit
  - Coverage measured at 75.57% statements, 74.67% branches, 55.61% functions, and 78.42% lines
- Backend clean integrated gate: passed
  - 920 tests, JaCoCo, SpotBugs, ArchUnit, packaging, and production compilation
- Local containers: passed
  - Compose configuration and backend/frontend image builds
- Flyway migrations: unchanged relative to `3afdcab47`

Do not commit or push unless the user explicitly requests it. Do not reset, stash, or switch branches while the working tree contains this implementation.

## Immutable Migration Constraint

The following directory is immutable:

```text
backend/src/main/resources/db/migration
```

Never add, edit, move, rename, reorder, or delete files in this directory as part of this refactoring.

Validate after every meaningful backend batch:

```bash
git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration
git diff --name-status 3afdcab47 -- backend/src/main/resources/db/migration
```

Both commands must remain empty.

## Domain Invariants

All remaining work must preserve these rules:

1. The system remains a modular monolith.
2. POS and online purchases share the unified `orders` model.
3. Stock is derived from `stock_lots`; no reservation or denormalized branch-stock table exists.
4. FEFO ordering is `expiration_date ASC NULLS LAST`, followed by deterministic lot identity.
5. Stock is deducted at payment confirmation for online orders and atomically within POS sale creation.
6. Cancellation and refunds restore the exact lots consumed by the original movements.
7. Cash close counts physical cash only; other methods are informational.
8. Online fulfillment is branch pickup only.
9. Guest checkout is not supported.
10. Controllers return DTOs, never JPA entities.
11. Transaction boundaries belong in application services.

## Completed Baseline

The following work is complete and should not be repeated:

- Frontend quality scripts, Angular dependency update, broad OnPush adoption, safe API-error parsing, production route cleanup, and integrated frontend verification.
- Frontend domain ownership moves out of `core` and `shared`.
- Frontend decomposition for inventory, dashboard, reports, orders, cash, suppliers, purchase orders, pricing, products, categories, users, checkout, and storefront.
- Backend Enforcer, Spotless, JaCoCo, SpotBugs, ArchUnit, CI workflow, and clean backend verification.
- Backend inventory responsibility split into query, lot command, deduction, adjustment, and reversal services.
- Pure deterministic FEFO policy and focused inventory characterization coverage.
- `auth -> users` migration through `UserDirectory`.
- POS stock deduction migration through `inventory.api.PosStockCommand`.
- POS zero-quantity lots now transition to `DEPLETED` through the inventory application path.
- Shared `ApiError` validation shape and generic internal-error handling.
- Application-level production security validation, origin policy, secure cookies, OpenAPI restrictions, TRACE rejection, and security headers.
- Docker/Nginx/ngrok configuration hardening and valid Compose configuration.

## Completed Refactoring Scope

The locally executable modular-monolith refactoring scope is complete:

- Frontend public feature APIs and automated boundary enforcement are active.
- Critical webhook, cancellation, cash, receipt, and stock-deduction races are serialized and covered by deterministic PostgreSQL tests.
- Expected online stock conflicts commit without partial deduction or rollback-only leakage.
- Cross-module repository, controller-repository, and field-injection allowlists are empty.
- The temporary `InventoryService` and `InventoryFacade` compatibility layer has been removed.
- Catalog, inventory, orders, payments, users, branches, supplier receipts, and pricing communicate through owned application contracts.
- Feature error statuses and webhook signature responses use the stable `ApiError` contract.
- Cohesive POS and online lifecycle integration tests cover FEFO, payment state, idempotency, stock conflict, refund, cancellation, and physical-cash reconciliation.
- Frontend verification passes with 986 tests; clean backend verification passes with 920 tests, JaCoCo, SpotBugs, and ArchUnit.
- Frontend clean installation, coverage measurement with enforced baseline thresholds, production build, production dependency audit, Compose parsing, and both Docker image builds pass locally.

The only remaining plan items are intentionally deferred external infrastructure validation and the future academic-documentation phase below.

## Deferred External Infrastructure Validation

**Status: explicitly deferred by the user. Do not attempt these tasks in the current refactoring session.**

Local clean installation, coverage measurement, production dependency audit, application gates, Compose parsing, action-SHA review, and both Docker image builds have passed. A future infrastructure session must:

- execute the GitHub Actions workflow remotely;
- verify production startup with deployment-shaped environment variables;
- configure and validate real secrets, DNS, TLS, and public payment URLs.

Real deployment requires:

- production database credentials;
- a strong JWT secret;
- Mercado Pago access and webhook secrets;
- public HTTPS callback and webhook URLs;
- explicit production origins;
- domain and DNS configuration;
- TLS termination and certificates;
- HSTS only after HTTPS is fully operational.

## Deferred Thesis-Grade Academic and Technical Documentation

**Status: explicitly deferred by the user. Do not execute this phase during the current refactoring session.**

Perform this phase only after the implementation and final architecture stabilize. The result must be complete enough to serve as the technical documentation for an academic thesis, not merely as developer notes.

#### Prompt for the future academic-documentation agent

Copy the complete prompt below into a new agent session after the refactoring and local quality gates are finished:

```text
You are the lead software architect, academic technical writer, requirements analyst, and evidence reviewer for Dietetica Lembas. Your task is to transform the repository documentation into thesis-grade academic and technical documentation of exceptional quality. This is a documentation and evidence-reconciliation task, not a feature-development task.

Repository context:
- Project: Dietetica Lembas, a point-of-sale and pickup-only e-commerce system.
- Architecture: modular monolith, not microservices.
- Backend: Java 21, Spring Boot 3.5, JPA/Hibernate, PostgreSQL 16, Flyway.
- Frontend: Angular 21 standalone components, signals, PrimeNG, Tailwind CSS.
- Infrastructure: Docker, Nginx, GitHub Actions, Mercado Pago integration.
- Core rules: unified POS/ONLINE orders; FEFO stock deduction; stock deducted at payment confirmation for online orders and atomically during POS sales; physical cash only in drawer reconciliation; exact-lot reversal for cancellation/refund; branch pickup only; no guest checkout; immutable Flyway migration history.

Mandatory interaction before editing:
1. Ask the user to confirm the thesis language. Preserve the repository's established language until confirmed.
2. Ask for the institution's required structure, formatting guide, citation style, page or word limits, and whether the repository documentation is the thesis itself or a technical appendix.
3. Ask whether personally identifying information, institution names, author names, supervisors, dates, or project-management evidence may be included.
4. If the user cannot provide a formal template, propose a conventional software-engineering thesis structure and one consistent citation style, clearly labeling that proposal.

Non-negotiable constraints:
1. Read `AGENTS.md` and all repository-specific instructions before doing anything else.
2. Use the documentation skill and inspect the full repository before editing.
3. Do not modify application code, tests, Flyway migrations, package-lock files, generated artifacts, credentials, or deployment secrets.
4. Do not commit, push, reset, stash, switch branches, or rewrite Git history unless explicitly requested.
5. Preserve intentional uncommitted work and assume other agents may share the working tree.
6. Do not invent requirements, test results, performance measurements, users, deployments, citations, production evidence, screenshots, incidents, or business outcomes.
7. Distinguish verified implementation facts, documented design intent, inferred rationale, limitations, and future work.
8. Cite authoritative external sources for standards and external technical claims. Never fabricate bibliographic metadata, URLs, quotations, or access dates.
9. Keep Flyway migrations immutable and describe them exactly as they exist.
10. Do not call external payment services or require real production secrets.

Stage 1 - Repository-wide evidence inventory:
1. Read every Markdown file under `docs/` completely, including cross-references.
2. Read the root README, frontend README, backend and frontend build files, CI workflow, Docker files, Nginx configuration, application configuration, route definitions, security configuration, architecture tests, shared error handling, module APIs, principal entities, repositories, application services, controllers, frontend state/data-access layers, and representative tests.
3. Inventory backend modules, frontend features, public module contracts, dependency rules, database migrations, endpoint controllers, emitted error codes, roles, permissions, state transitions, and quality gates from source.
4. Inspect Git history only when needed to explain an architectural decision or evolution; do not treat commit messages as stronger evidence than current code and tests.
5. Build an evidence ledger with columns for claim, source file, relevant symbol or section, confidence, documentation destination, and unresolved conflict.
6. Identify contradictions among documentation, code, tests, configuration, and diagrams before changing any document.
7. Report blocking ambiguities to the user instead of resolving them by assumption.

Stage 2 - Documentation information architecture:
Design a coherent academic structure that covers, at minimum:
1. Abstract and executive summary.
2. Introduction, problem statement, motivation, general objective, specific objectives, scope, assumptions, constraints, and exclusions.
3. Stakeholders, actors, roles, functional requirements, non-functional requirements, acceptance criteria, and requirement prioritization.
4. Research/development methodology, engineering process, tools, quality strategy, and the role and disclosure of AI assistance.
5. Domain analysis: glossary, entities, relationships, invariants, business rules, state machines, and business processes.
6. Architecture rationale: modular-monolith selection, comparison with plausible alternatives, quality attributes, trade-offs, boundaries, dependency direction, and ADR traceability.
7. Backend design: module APIs, application services, persistence, DTO boundaries, transactions, pessimistic locking, idempotency, error handling, security, and observability.
8. Frontend design: standalone architecture, routing, state ownership, public feature APIs, signals, all-states pattern, accessibility, design system, and API-error mapping.
9. Data design: conceptual, logical, and physical models; tables; keys; constraints; indexes; audit timestamps; migration strategy; and data-integrity rules.
10. API design: conventions, authentication, endpoint inventory, payload examples, pagination, stable error catalog, webhook verification, and idempotency behavior.
11. Critical workflows: FEFO, POS sale, online checkout/payment, webhook approval, stock conflict, cancellation, refund, cash opening/movement/close, purchase order, receipt confirmation, and price updates.
12. Security analysis: assets, actors, trust boundaries, threat model, authentication lifecycle, authorization matrix, cookies/tokens, CSRF/origin strategy, secrets, transport security, container hardening, and residual risks.
13. Concurrency and reliability: race scenarios, lock ordering, transaction boundaries, exact-once effects within the database model, rollback behavior, retry semantics, and known failure modes.
14. Verification and validation: test pyramid, unit/slice/integration/Testcontainers/ArchUnit coverage, deterministic concurrency method, static analysis, formatting, coverage gates, build reproducibility, and evidence limitations.
15. Deployment and operations: topology, environment variables, Docker images, Nginx, health checks, CI, database backup/recovery, logs, monitoring expectations, TLS, DNS, Mercado Pago callbacks, and production-readiness limitations.
16. Results and discussion based only on reproducible evidence.
17. Limitations, ethical/privacy considerations, future work, conclusions, bibliography, glossary, and appendices.

Stage 3 - Traceability artifacts:
1. Create or reconcile a functional-requirements matrix linking requirement IDs to actors, business rules, backend modules, frontend routes/components, API endpoints, database entities, and acceptance tests.
2. Create a non-functional-requirements matrix linking quality attributes to architectural tactics, configuration, static rules, tests, and remaining risks.
3. Create an ADR-to-implementation matrix linking each relevant decision to current packages, contracts, tests, and superseding decisions.
4. Create an endpoint-to-controller-to-service-to-error-code matrix.
5. Create a critical-workflow-to-test matrix covering normal, validation, authorization, concurrency, rollback, and recovery scenarios.
6. Every traceability row must point to real repository evidence; unresolved rows must be marked as gaps, not completed work.

Stage 4 - Diagrams and models:
Create or correct diagrams using the repository's established text-based diagram format, preferably Mermaid when compatible:
1. System context diagram.
2. Container/deployment diagram.
3. Backend component/module diagram.
4. Frontend feature/route/state-ownership diagram.
5. Conceptual and physical entity-relationship diagrams.
6. Trust-boundary/security diagram.
7. State diagrams for orders, payments, cash sessions, purchase orders, receipts, and relevant pricing batches.
8. Sequence diagrams for every critical workflow listed above.
9. Concurrency sequence diagrams for duplicate webhook delivery, refund/cancellation serialization, cash close races, and concurrent receipt confirmation.
10. Each diagram must include a title, legend where needed, explanatory analysis, and source references. Validate syntax with available tooling. Never draw a component, queue, cache, reservation, delivery mode, or integration that does not exist.

Stage 5 - Academic argument and sources:
1. Explain the modular-monolith decision using quality attributes and project constraints, then compare it fairly with a layered monolith and microservices.
2. Explain FEFO and transactional stock integrity using domain and database evidence.
3. Explain pessimistic locking and idempotency with precise race scenarios and happens-before reasoning.
4. Explain security decisions using authoritative sources such as official Spring, Angular, PostgreSQL, OWASP, Docker, Nginx, Mercado Pago, and relevant standards documentation.
5. Prefer primary sources, official documentation, standards, and peer-reviewed literature. Use secondary sources only when justified.
6. Record complete bibliographic data and one consistent citation style. Verify every citation and link.
7. Do not present implementation choices as scientifically proven improvements unless measured evidence exists.

Stage 6 - File-by-file reconciliation:
1. Update every relevant file under `docs/00-overview`, `docs/01-product`, `docs/02-domain`, `docs/03-architecture`, `docs/04-processes`, `docs/05-api`, `docs/06-development`, and `docs/07-deployment`.
2. Reconcile the root README and frontend README with the final implementation and clean-clone setup.
3. Preserve useful ADR history while marking superseded or historical statements clearly.
4. Remove stale scaffold descriptions, duplicated explanations, obsolete endpoints, legacy error codes, contradictory states, fake infrastructure claims, and undocumented exceptions.
5. Keep terminology consistent across all files: role names, module names, status names, HTTP statuses, error codes, route names, entity names, FEFO semantics, and pickup-only scope.
6. Update `docs/ai-usage-log.md` concisely for this substantial documentation work.
7. Create a thesis/documentation index that explains reading order and maps repository chapters to the institution's thesis structure.

Stage 7 - Reproducible evidence and validation:
1. Use existing successful build/test evidence only when it can be traced to logs or rerun safely.
2. Run documentation-only checks first: placeholder scan, broken relative-link scan, duplicate heading/anchor review, stale-version search, endpoint/code inventory comparison, and Mermaid syntax validation where available.
3. If application gates must be rerun, do so sequentially and respect repository memory constraints. Never run Maven, Angular tests, and Docker builds concurrently.
4. Verify documented commands against package scripts, Maven configuration, Docker files, and CI workflow.
5. Compare documented endpoints against controller mappings and documented error codes against actual DomainException emitters/constants.
6. Compare module-boundary claims against ArchUnit and import searches.
7. Record exact commands, dates, outcomes, test counts, tool versions, and limitations in an evidence appendix. Do not reuse obsolete counts.
8. Run `git diff --check` and confirm no Flyway migration changed relative to the protected baseline stated in the repository plan.

Required final deliverables:
1. A complete, coherent, cross-linked documentation set suitable for thesis evaluation.
2. A documentation index and recommended reading order.
3. Requirement, architecture, API, ADR, and test traceability matrices.
4. Correct C4-style, ER, state, sequence, deployment, and security diagrams.
5. A verified glossary and acronym list.
6. A consistent bibliography with validated citations.
7. A reproducibility and evidence appendix.
8. A documentation consistency report containing:
   - files reviewed and changed;
   - evidence sources used;
   - contradictions resolved;
   - claims intentionally qualified;
   - externally blocked validation;
   - remaining documentation gaps;
   - link, diagram, placeholder, endpoint, and error-code check results.

Quality standard:
- Write precise academic prose without filler, marketing language, unsupported superlatives, or repetitive summaries.
- Explain not only what exists, but why it exists, which alternatives were considered, what evidence supports it, and what limitations remain.
- Use tables and diagrams when they improve comparison or traceability, not decoratively.
- Keep code excerpts short, necessary, current, and referenced to their source paths.
- Ensure a thesis evaluator can reproduce setup and verification from a clean clone without prior project knowledge.
- Stop and ask the user whenever institutional requirements or conflicting evidence could materially change the document structure or conclusions.

Before finishing, provide a concise change summary, the validation report, and an explicit list of facts that could not be independently verified. Do not claim the thesis documentation is complete while unresolved contradictions or fabricated placeholders remain.
```

#### Required documentation review

Review and update every file under `docs/`, plus the root and frontend READMEs. Give special attention to:

- project scope, objectives, stakeholders, assumptions, and exclusions;
- functional and non-functional requirements with traceability to implemented modules and tests;
- domain rules, entities, state machines, invariants, and business-process descriptions;
- C4-style context, container, and component views;
- backend and frontend module boundaries, dependency direction, and public contracts;
- database design, relationship diagrams, constraints, indexes, transaction boundaries, and immutable Flyway history;
- security model, authentication lifecycle, authorization matrix, threat analysis, trust boundaries, and secret management;
- API conventions, endpoint inventory, request/response examples, stable error catalog, and webhook behavior;
- FEFO, POS, online purchase, payment, refund, cancellation, cash, and supplier-receipt sequence diagrams;
- concurrency strategy, locking decisions, idempotency, rollback behavior, and failure recovery;
- testing methodology, test pyramid, deterministic concurrency tests, coverage evidence, quality gates, and reproducible commands;
- deployment topology, environment configuration, Docker/Nginx/ngrok responsibilities, TLS requirements, observability, backup, and recovery;
- architectural decisions, alternatives considered, trade-offs, known limitations, and future work;
- glossary, acronyms, bibliography/references, diagram legend, and appendices with reproducible validation evidence;
- explicit disclosure of meaningful AI-assisted work using `docs/ai-usage-log.md`.

#### Primary files

At minimum, reconcile:

- `docs/00-overview/`
- `docs/01-product/`
- `docs/02-domain/`
- `docs/03-architecture/`
- `docs/04-processes/`
- `docs/05-api/`
- `docs/06-development/`
- `docs/07-deployment/`
- root README
- frontend README
- `docs/ai-usage-log.md`

#### Academic quality criteria

1. Separate observed implementation facts from design rationale and future proposals.
2. Support architectural and quality claims with code, test, configuration, or command evidence.
3. Keep terminology, identifiers, HTTP statuses, roles, and state transitions consistent across all chapters.
4. Include sources for external standards, frameworks, security guidance, and domain assumptions using one consistent citation style.
5. Ensure every diagram matches the implemented code and has an explanatory caption or surrounding analysis.
6. Provide requirement-to-design-to-test traceability for critical workflows.
7. Explain why the modular monolith was chosen and compare it with rejected alternatives without overstating results.
8. Record limitations honestly, including infrastructure that cannot be validated without production secrets, DNS, TLS, or remote CI.
9. Remove stale scaffolding descriptions, historical contradictions, placeholders, and undocumented legacy behavior.
10. Make setup and verification procedures reproducible by a thesis evaluator from a clean clone.

#### Documentation validation

- verify every relative link and referenced file;
- validate Mermaid or other diagram syntax where tooling is available;
- search for placeholders, stale version numbers, obsolete endpoints, and contradictory domain rules;
- compare documented endpoints and error codes against controllers and emitted exceptions;
- compare documented modules and dependencies against ArchUnit and dependency-search results;
- run spelling/style checks if configured, without silently changing domain terminology;
- include a final documentation consistency report listing evidence reviewed and any externally blocked validation.

Document actual packages, contracts, commands, test counts, and error codes only. Do not invent experimental results, deployment evidence, citations, or production behavior.

## Local Completion Evidence

The refactoring is locally complete based on the following evidence:

- `cd frontend && npm ci` completed successfully.
- `cd frontend && npm run verify` passed with 150 test files and 986 tests.
- `cd frontend && npm run test:coverage` passed with enforced global thresholds of 75% statements, 74% branches, 55% functions, and 78% lines.
- `cd frontend && npm audit --omit=dev --audit-level=high` reported zero production vulnerabilities.
- `cd backend && ./mvnw clean verify` passed with 920 tests, JaCoCo, SpotBugs, and ArchUnit.
- `docker compose --env-file docker/.env.example -f docker/compose.yml config --quiet` passed.
- Both verification Docker images built successfully.
- Frontend feature-boundary enforcement passes.
- Cross-module repository, controller-repository, and field-injection allowlists are empty.
- The sole shared-to-feature allowlist entry is the intentional infrastructure wiring from `SecurityConfig` to `JwtAuthenticationFilter`.
- `git diff --check` passes.
- Flyway migrations remain unchanged relative to `3afdcab47`.

Do not reopen completed refactoring work unless a regression is demonstrated. The only planned follow-ups are the two explicitly deferred phases above.
