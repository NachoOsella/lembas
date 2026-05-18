# Project Risks

## Technical risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Concurrent POS + webhook causes overselling | Low | High | Pessimistic locking (SELECT FOR UPDATE) on stock_lots |
| Duplicate MP webhook double-deducts stock | Low | High | Idempotency check by provider_payment_id before any side effects |
| MP API changes break integration | Low | Medium | Keep MP API calls localized in payment/webhook services. Update those classes when the API changes |
| Database schema changes late in project | Medium | Medium | Flyway migrations versioned and tested. Rollback script available |
| Front-backend type mismatch | Medium | Low | DTOs with validation, OpenAPI spec for contract consistency |
| Performance with large product catalog | Low | Low | Paginated queries, indexed columns, lazy loading in frontend |

## Project risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Scope creep (adding post-MVP features) | Medium | High | Documented scope, ADR for every exclusion, tutor review |
| Underestimating effort for critical flows | Medium | Medium | 4-sprint plan with buffer, critical paths prioritized early |
| Single point of failure (one developer) | High | Medium | Documentation-first approach, AI agent context for continuity |
| Integration complexity (MP webhook) | Medium | Medium | No more external integrations in MVP. Adapter isolates MP |
| Cash register logic misunderstood by evaluator | Medium | Low | Cash register rules document explains design rationale |

## Academic risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Tutor considers MVP scope insufficient | Low | High | Documented scope with clear MVP success criteria. Justifications for each exclusion |
| Tutor expects microservices architecture | Low | Medium | ADR-001 documents why modular monolith is the right choice for a single developer |
| Tutor expects AI/ML features | Low | Medium | ADR-008 documents why rule-based recommendations are preferred |
| Tutor expects mobile app | Low | Low | Documented as out-of-scope. Responsive web covers mobile use cases |
| Evaluation criteria not met | Low | High | Technical justification document maps competencies to evidence |

## Risk monitoring

Risks are reviewed at the end of each sprint during the retrospective. Any new risks are documented and added to the mitigation plan.
