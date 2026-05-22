# AI Usage Log

## 2026-05-21

- `backend/src/main/resources/db/migration/V1__core.sql`, `V2__catalog.sql` — Flyway initial migrations for S1-US03 (LEMBAS-73, LEMBAS-74, LEMBAS-75): branches, users with role CHECK, categories, products with online_status CHECK and sale_price CHECK.
- `backend/src/main/resources/db/migration/V10__seed_data.sql` — partial seed data for local dev (LEMBAS-77): branch Centro, admin demo user, base categories.

- `frontend/src/styles.css`, `index.html`, `angular.json` — theme tokens, font preconnect, budget bump.
- `frontend/public/brand/lembas-logo.png` — brand logo asset.
- `frontend/src/app/app.config.ts` — disable PrimeNG dark mode.
- `frontend/src/app/shared/components/*` — migrate LoadingSpinner, EmptyState, ErrorAlert, ConfirmDialog, Skeleton to PrimeNG with brand styles.
- `frontend/src/app/features/public-store/store-layout/`, `public-store.routes.ts` — store layout shell (header + footer + router-outlet).
- `frontend/src/app/features/dev/component-showcase/` — update to exercise new shared components.
- `frontend/src/app/features/admin/admin-layout/`, `admin.routes.ts` — AdminLayout with collapsible sidebar, topbar, breadcrumbs, router-outlet.
- `backend/src/main/java/com/dietetica/lembas/shared/{dto,web}/`, `backend/src/test/java/com/dietetica/lembas/shared/web/` — added uniform `ApiError` payload, global exception handler, and handler tests.
- `backend/src/test/java/com/dietetica/lembas/LembasBackendApplicationTests.java`, `frontend/src/app/shared/components/skeleton/skeleton.spec.ts` — fixed backend smoke test and Skeleton component spec.
- `backend/src/test/java/com/dietetica/lembas/auth/`, `backend/src/test/java/com/dietetica/lembas/users/`, `backend/pom.xml` — added auth service/mapper/JWT/DTO validation tests and a PostgreSQL Testcontainers `UserRepository` JPA slice test using Testcontainers 2.0.5.
