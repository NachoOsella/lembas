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

## 2026-05-22

- `backend/src/main/resources/db/migration/V1__core.sql`, `backend/src/main/java/com/dietetica/lembas/users/service/UserBranchPolicy.java` — enforced role/branch consistency in DB and service policy, removed redundant email index, and added policy/JPA constraint tests.
- `backend/src/main/java/com/dietetica/lembas/auth/web/AuthController.java` — added public `POST /api/auth/register` endpoint with DTO validation and MVC tests for success, validation errors, and duplicate email.
- `frontend/src/app/features/auth/register/register.ts`, `frontend/src/app/core/services/auth.ts` — mapped backend `EMAIL_DUPLICATED` and `VALIDATION_ERROR` responses to specific registration UI messages, including field-level validation details.
- `frontend/src/app/features/auth/{register,login}/` — changed successful registration to redirect to login with a success query param and added the login success alert state.
- `docker/nginx.conf` — fixed Swagger UI blank page by proxying `/swagger-ui/**` before the generic static asset regex, so Swagger CSS/JS are served by the backend.
- `backend/src/test/java/com/dietetica/lembas/auth/service/AuthServiceTest.java` — rewrote AuthServiceTest with `Should_expected_when_condition` pattern, added password hash, email normalization, null phone, and no-side-effects-on-duplicate tests (from 2 to 7 tests).
- `backend/src/test/java/com/dietetica/lembas/auth/integration/AuthRegistrationIntegrationTest.java` — added `@SpringBootTest` + Testcontainers integration test for the full registration flow (7 tests: persistence, BCrypt encoding, duplicate rejection, email normalization, unique constraint).
- `frontend/src/app/core/services/auth.ts` — added `register()` method using HttpClient for `POST /api/auth/register`.
- `frontend/src/app/core/services/auth.spec.ts` — rewrote auth service tests with `Should_*` covering happy path, null phone, 409 duplicated email, 400 validation error, and network failure (5 tests).
- `frontend/src/app/features/auth/register/register.spec.ts` — enhanced Register component tests with injection verification and template assertion.
- `frontend/src/app/features/auth/register/`, `frontend/src/app/core/services/auth.ts` — implemented polished signal-form registration flow with validation, password visibility, API submission, auth state persistence, and redirect to `/store`.
- `frontend/src/app/shared/components/app-{button,badge,field-hint,page-header,section-card}/` — added reusable shared UI building blocks with specs and barrel exports for consistent future screens.
- `frontend/src/app/features/dev/component-showcase/` — expanded `/dev/ui` to document and preview the new shared UI components alongside existing feedback components.
