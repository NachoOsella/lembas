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
- `frontend/src/styles.css`, `frontend/src/app/**/*.css`, `frontend/src/app/**/*.html`, `frontend/DESING.md`, `frontend/public/brand/lembas-icon.svg`, `frontend/public/favicon.ico` — retuned frontend brand palette to a muted IG-aligned Lembas green system, switched to a transparent leaf-only SVG icon/favicon with stronger strokes, replaced old logo usages, and removed prior Starbucks-inspired references.
- `frontend/src/app/features/auth/login/`, `frontend/src/app/core/services/auth.ts` — implemented the login signal form to match the register page visual system, including validation, password visibility, API submission, auth state save, and role-based redirect.
- `frontend/src/app/features/auth/{login,register}/`, `AGENTS.md` — refactored auth form controls to use PrimeNG directives/components where compatible with Angular signal forms and documented the PrimeNG-first frontend rule.
- `frontend/src/app/shared/components/app-{button,badge,field-hint,section-card}/` — refactored generic shared wrappers to render PrimeNG primitives internally while preserving Lembas APIs and styling.

## 2026-05-25

- `backend/src/main/java/com/dietetica/lembas/auth/service/LembasUserDetails.java` -- Spring Security `UserDetails` adapter tipico puenteando `User` entity a `DaoAuthenticationProvider`, mapea roles con prefijo `ROLE_`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/LembasUserDetailsService.java` -- `UserDetailsService` estandar con doble lookup por email (login) y por ID (JWT filter).
- `backend/src/main/java/com/dietetica/lembas/auth/service/JwtAuthenticationFilter.java` -- `OncePerRequestFilter` estandar extrayendo Bearer tokens, validando y poblando `SecurityContextHolder`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/SecurityContextHelper.java` -- helper simple para obtener `User` desde `SecurityContext` para `GET /api/auth/me`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/JwtTokenProvider.java` -- agregados `validateToken()`, `getUserIdFromToken()`, `getRoleFromToken()` + `UUID.randomUUID()` como claim `jti` para garantizar unicidad de tokens en logins sucesivos.
- `backend/src/main/java/com/dietetica/lembas/auth/service/AuthService.java` -- agregados `authenticate()` (BCrypt check + cuenta deshabilitada + emision de tokens) y `getCurrentUser()`.
- `backend/src/main/java/com/dietetica/lembas/auth/web/AuthController.java` -- agregados `POST /api/auth/login` y `GET /api/auth/me` con inyeccion de `SecurityContextHelper`.
- `backend/src/main/java/com/dietetica/lembas/shared/config/SecurityConfig.java` -- cableado `JwtAuthenticationFilter` antes de `UsernamePasswordAuthenticationFilter` + bean `AuthenticationManager`.
- `backend/src/test/java/com/dietetica/lembas/auth/service/AuthServiceTest.java` -- +8 tests de login (credenciales validas, email incorrecto, password incorrecto, cuenta deshabilitada, normalizacion de email, hardening anti-enumeracion) + 1 test `getCurrentUser`.
- `backend/src/test/java/com/dietetica/lembas/auth/service/JwtTokenProviderTest.java` -- +4 tests de validacion (token expirado, firma incorrecta, token malformado) + 2 tests de extraccion (userId, role). Requirio corregir secret key de 208 bits a 256 bits minimo para jjwt 0.12.6.
- `backend/src/test/java/com/dietetica/lembas/auth/service/JwtAuthenticationFilterTest.java` -- 6 tests unitarios cubriendo token valido, sin header, header no-Bearer, expirado, malformado y continuidad de filter chain.
- `backend/src/test/java/com/dietetica/lembas/auth/web/AuthControllerTest.java` -- +3 tests MVC slice de login (200, 401, 403) + 1 test `/me`; requirio `@MockitoBean JwtAuthenticationFilter` para que levante el contexto.
- `backend/src/test/java/com/dietetica/lembas/auth/integration/AuthLoginIntegrationTest.java` -- 8 tests de integracion `@SpringBootTest` + Testcontainers postgres:16-alpine cubriendo login valido, unicidad de tokens, password incorrecto, email inexistente, cuenta deshabilitada, normalizacion de email, verificacion BCrypt, hardening contra raw passwords.
- `backend/src/main/java/com/dietetica/lembas/{auth/service,shared/config}/`, `backend/src/test/java/com/dietetica/lembas/{auth/service,shared/config}/`, `docs/03-architecture/security-architecture.md` -- hardening post-review: refresh tokens ya no autentican endpoints API, `/api/auth/me` requiere JWT segun endpoints.md, stale JWT subjects no generan 500, y normalizacion de email usa `Locale.ROOT`.

### 2026-05-25 - AuthInterceptor (frontend JWT token attachment)

- `frontend/src/app/core/services/auth.ts` -- modificado: persistencia de JWT access token y usuario autenticado en `localStorage` (claves `lembas_access_token`, `lembas_user`); nuevo metodo `getAccessToken()`; hidratacion de estado al construir el servicio; limpieza en `clearAuth()`.
- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- nuevo: interceptor funcional `HttpInterceptorFn` que agrega header `Authorization: Bearer <token>` a toda request saliente si hay token disponible; respeta headers `Authorization` ya existentes.
- `frontend/src/app/app.config.ts` -- registrado `authInterceptor` en `provideHttpClient(withInterceptors([...]))` antes de `errorInterceptor`.
- `frontend/src/app/core/interceptors/auth-interceptor.spec.ts` -- 5 tests unitarios: attach con token, sin token, preservacion de header existente, request publica sin token, POST con token.
- `frontend/src/app/core/services/auth.spec.ts` -- agregados 5 tests: persistencia token+user, recuperacion token, null sin token, isAuthenticated=true tras persistencia, clearAuth limpia localStorage.
- `frontend/vitest-base.config.ts` -- nuevo: configuracion base de Vitest con `environment: 'jsdom'` para disponibilidad de APIs de navegador.

### 2026-05-25 - Code review fixes: interceptor scoping, auth hydration hardening, refreshToken cleanup

- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- restringido attachment de JWT solo a requests con URL que comienza con `/api/` para evitar fuga de token a terceros.
- `frontend/src/app/core/services/auth.ts` -- quitado `refreshToken` de `AuthResponse` (no se usa en frontend); `isAuthenticated` ahora verifica tambien existencia de token; constructor limpia stale user data si no hay token; `loadStoredUser()` valida la forma del objeto persistido (id, email, firstName, lastName, role valido) antes de usarlo.
- `frontend/src/app/core/services/auth.spec.ts` -- agregados 5 tests de hydration con token+user, token faltante, malformed user, rol invalido; agregado `vi.unstubAllGlobals()` en afterEach;
- `frontend/src/app/core/interceptors/auth-interceptor.spec.ts` -- agregado test que verifica que token no se adjunta a URLs externas.
- `frontend/src/app/features/auth/register/register.spec.ts` -- removido `refreshToken` del mock de `AuthResponse`.

### 2026-05-25 - Code review fixes: reactive auth token state and test cleanup

- `frontend/src/app/core/services/auth.ts` -- auth token moved to an internal signal so `isAuthenticated` depends only on reactive state; `saveAuthResponse()` now updates token/user state consistently; `clearAuth()` resets both; persisted optional branch fields are validated before hydration.
- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- extracted backend API URL check into `isBackendApiRequest()` helper for clearer future API base URL changes.
- `frontend/src/app/core/services/auth.spec.ts` -- deduplicated localStorage test setup with `stubLocalStorage()` and added malformed optional branch field coverage.
