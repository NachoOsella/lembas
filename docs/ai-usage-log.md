# Registro de uso de IA

## 2026-06-04

- `backend/src/main/resources/db/migration/V4__inventory.sql`, `backend/src/main/java/com/dietetica/lembas/inventory/` -- implementada S2-US01 (LEMBAS-40): modelo de stock por lotes, movimientos de inventario, consultas de disponibilidad/FEFO y endpoint paginado `GET /api/admin/stock/lots` con cobertura MVC/JPA.

## 2026-06-03

- `backend/src/main/resources/db/migration/V16__seed_demo_users.sql`, `backend/src/test/java/com/dietetica/lembas/AbstractIntegrationTest.java`, `frontend/proxy.conf.json`, `frontend/package.json` -- completadas subtasks de S1-US12: usuarios demo empleado/customer, proxy dev unificado, base reusable de integration tests y scripts npm de testing/lint.
- `backend/src/test/java/com/dietetica/lembas/catalog/repository/ProductRepositoryTest.java`, `frontend/src/app/shared/components/app-store-{footer,nav}/`, `frontend/src/app/features/admin/users/user-form/` -- corregidos tests afectados por seeds demo, plantillas actuales y miembros protegidos; suites backend/frontend quedan verdes.
- `backend/src/test/java/com/dietetica/lembas/catalog/web/ProductAdminControllerTest.java` -- nuevo WebMvcTest con matriz completa ADMIN/MANAGER/EMPLOYEE/UNAUTHENTICATED para CRUD + changeStatus (2xx/4xx DomainException).
- `backend/src/test/java/com/dietetica/lembas/shared/branch/service/BranchServiceTest.java` -- nuevo unit test para BranchService.listActiveBranches con mocks de repositorio.
- `backend/src/test/java/com/dietetica/lembas/auth/service/LembasUserDetailsServiceTest.java` -- nuevo unit test para loadUserByUsername/loadUserById con normalizacion de email y not-found.
- `backend/src/test/java/com/dietetica/lembas/auth/service/SecurityContextHelperTest.java` -- nuevo unit test para getCurrentUser con autenticacion valida, ausente, no autenticada y principal inesperado.
- `backend/src/test/java/com/dietetica/lembas/catalog/integration/CatalogAdminStoreIntegrationTest.java` -- agregados tests de integracion full-stack para catalogo: JWT admin real, creacion de categoria/producto, publicacion, visibilidad en tienda publica, rechazo sin token y contrato paginado actual.
- `backend/src/main/java/com/dietetica/lembas/shared/dto/PageResponse.java`, controllers paginados y modelos FE -- reemplazada serializacion directa de `PageImpl` por contrato paginado estable sin campos internos `pageable/sort`, manteniendo campos usados por frontend.
- `frontend/src/app/shared/components/app-toggle-switch/`, `frontend/src/app/features/admin/users/user-list/` -- creado toggle switch generico basado en PrimeNG con colores Lembas de `DESING.md` y reemplazado el toggle especifico de estado de usuarios.

## 2026-05-21

- `backend/src/main/resources/db/migration/V1__core.sql`, `V2__catalog.sql` -- migraciones iniciales Flyway para S1-US03 (LEMBAS-73, LEMBAS-74, LEMBAS-75): sucursales, usuarios con CHECK de rol, categorias, productos con CHECK de online_status y sale_price.
- `backend/src/main/resources/db/migration/V10__seed_data.sql` -- datos semilla parciales para desarrollo local (LEMBAS-77): sucursal Centro, usuario admin demo, categorias base.

- `frontend/src/styles.css`, `index.html`, `angular.json` -- tokens de tema, preconnect de fuente, ajuste de budget.
- `frontend/public/brand/lembas-logo.png` -- asset de logo de marca.
- `frontend/src/app/app.config.ts` -- desactivado modo oscuro de PrimeNG.
- `frontend/src/app/shared/components/*` -- migrados LoadingSpinner, EmptyState, ErrorAlert, ConfirmDialog, Skeleton a PrimeNG con estilos de marca.
- `frontend/src/app/features/public-store/store-layout/`, `public-store.routes.ts` -- shell de layout de tienda (header + footer + router-outlet).
- `frontend/src/app/features/dev/component-showcase/` -- actualizado para ejercitar los nuevos componentes compartidos.
- `frontend/src/app/features/admin/admin-layout/`, `admin.routes.ts` -- AdminLayout con sidebar colapsable, topbar, breadcrumbs, router-outlet.
- `backend/src/main/java/com/dietetica/lembas/shared/{dto,web}/`, `backend/src/test/java/com/dietetica/lembas/shared/web/` -- agregado payload uniforme `ApiError`, manejador global de excepciones y tests del handler.
- `backend/src/test/java/com/dietetica/lembas/LembasBackendApplicationTests.java`, `frontend/src/app/shared/components/skeleton/skeleton.spec.ts` -- arreglado smoke test de backend y spec de Skeleton.
- `backend/src/test/java/com/dietetica/lembas/auth/`, `backend/src/test/java/com/dietetica/lembas/users/`, `backend/pom.xml` -- agregados tests de servicio/mapper/JWT/DTO de auth y un test JPA slice de `UserRepository` con PostgreSQL Testcontainers usando Testcontainers 2.0.5.

## 2026-05-22

- `backend/src/main/resources/db/migration/V1__core.sql`, `backend/src/main/java/com/dietetica/lembas/users/service/UserBranchPolicy.java` -- reforzada consistencia rol/sucursal en BD y politica de servicio, eliminado indice de email redundante, agregados tests de politica y restricciones JPA.
- `backend/src/main/java/com/dietetica/lembas/auth/web/AuthController.java` -- agregado endpoint publico `POST /api/auth/register` con validacion DTO y tests MVC para exito, errores de validacion y email duplicado.
- `frontend/src/app/features/auth/register/register.ts`, `frontend/src/app/core/services/auth.ts` -- mapeadas respuestas `EMAIL_DUPLICATED` y `VALIDATION_ERROR` del backend a mensajes especificos de UI de registro, incluyendo detalles de validacion por campo.
- `frontend/src/app/features/auth/{register,login}/` -- cambiado registro exitoso para redirigir a login con query param de exito y agregado estado de alerta de login exitoso.
- `docker/nginx.conf` -- arreglada pagina en blanco de Swagger UI proxyando `/swagger-ui/**` antes de la regex generica de assets estaticos, para que CSS/JS de Swagger sean servidos por el backend.
- `backend/src/test/java/com/dietetica/lembas/auth/service/AuthServiceTest.java` -- reescrito AuthServiceTest con patron `Should_esperado_cuando_condicion`, agregados tests de hash de password, normalizacion de email, phone nulo y sin efectos secundarios en duplicado (de 2 a 7 tests).
- `backend/src/test/java/com/dietetica/lembas/auth/integration/AuthRegistrationIntegrationTest.java` -- agregado test de integracion `@SpringBootTest` + Testcontainers para el flujo completo de registro (7 tests: persistencia, encoding BCrypt, rechazo de duplicado, normalizacion de email, restriccion unique).
- `frontend/src/app/core/services/auth.ts` -- agregado metodo `register()` usando HttpClient para `POST /api/auth/register`.
- `frontend/src/app/core/services/auth.spec.ts` -- reescritos tests de auth service con `Should_*` cubriendo camino feliz, phone nulo, 409 email duplicado, 400 error de validacion y fallo de red (5 tests).
- `frontend/src/app/features/auth/register/register.spec.ts` -- mejorados tests de Register con verificacion de inyeccion y asercion de template.
- `frontend/src/app/features/auth/register/`, `frontend/src/app/core/services/auth.ts` -- implementado flujo de registro pulido con signal forms, validacion, visibilidad de password, envio API, persistencia de estado auth y redireccion a `/store`.
- `frontend/src/app/shared/components/app-{button,badge,field-hint,page-header,section-card}/` -- agregados bloques de UI compartidos reutilizables con specs y barrel exports para pantallas futuras consistentes.
- `frontend/src/app/features/dev/component-showcase/` -- expandido `/dev/ui` para documentar y previsualizar los nuevos componentes compartidos junto a los de feedback existentes.
- `frontend/src/styles.css`, `frontend/src/app/**/*.css`, `frontend/src/app/**/*.html`, `frontend/DESING.md`, `frontend/public/brand/lembas-icon.svg`, `frontend/public/favicon.ico` -- reajustada paleta de marca del frontend a un sistema de verdes Lembas alineado a IG, cambiado a icono/favicon SVG transparente de solo hoja con trazos mas fuertes, reemplazados usos de logo viejo y eliminadas referencias previas inspiradas en Starbucks.
- `frontend/src/app/features/auth/login/`, `frontend/src/app/core/services/auth.ts` -- implementado login con signal form para igualar el sistema visual de registro, incluyendo validacion, visibilidad de password, envio API, guardado de estado auth y redireccion basada en rol.
- `frontend/src/app/features/auth/{login,register}/`, `AGENTS.md` -- refactorizados controles de formulario auth para usar directivas/componentes PrimeNG donde son compatibles con Angular signal forms y documentada la regla PrimeNG-first de frontend.
- `frontend/src/app/shared/components/app-{button,badge,field-hint,section-card}/` -- refactorizados wrappers compartidos genericos para renderizar primitivas PrimeNG internamente preservando APIs y estilos Lembas.

## 2026-05-25

- `backend/src/main/java/com/dietetica/lembas/auth/service/LembasUserDetails.java` -- adaptador Spring Security `UserDetails` tipico puenteando entidad `User` a `DaoAuthenticationProvider`, mapea roles con prefijo `ROLE_`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/LembasUserDetailsService.java` -- `UserDetailsService` estandar con doble lookup por email (login) y por ID (filtro JWT).
- `backend/src/main/java/com/dietetica/lembas/auth/service/JwtAuthenticationFilter.java` -- `OncePerRequestFilter` estandar extrayendo tokens Bearer, validando y poblando `SecurityContextHolder`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/SecurityContextHelper.java` -- helper simple para obtener `User` desde `SecurityContext` para `GET /api/auth/me`.
- `backend/src/main/java/com/dietetica/lembas/auth/service/JwtTokenProvider.java` -- agregados `validateToken()`, `getUserIdFromToken()`, `getRoleFromToken()` + `UUID.randomUUID()` como claim `jti` para garantizar unicidad de tokens en logins sucesivos.
- `backend/src/main/java/com/dietetica/lembas/auth/service/AuthService.java` -- agregados `authenticate()` (verificacion BCrypt + cuenta deshabilitada + emision de tokens) y `getCurrentUser()`.
- `backend/src/main/java/com/dietetica/lembas/auth/web/AuthController.java` -- agregados `POST /api/auth/login` y `GET /api/auth/me` con inyeccion de `SecurityContextHelper`.
- `backend/src/main/java/com/dietetica/lembas/shared/config/SecurityConfig.java` -- cableado `JwtAuthenticationFilter` antes de `UsernamePasswordAuthenticationFilter` + bean `AuthenticationManager`.
- `backend/src/test/java/com/dietetica/lembas/auth/service/AuthServiceTest.java` -- +8 tests de login (credenciales validas, email incorrecto, password incorrecto, cuenta deshabilitada, normalizacion de email, hardening anti-enumeracion) + 1 test `getCurrentUser`.
- `backend/src/test/java/com/dietetica/lembas/auth/service/JwtTokenProviderTest.java` -- +4 tests de validacion (token expirado, firma incorrecta, token malformado) + 2 tests de extraccion (userId, role). Requirio corregir secret key de 208 bits a 256 bits minimo para jjwt 0.12.6.
- `backend/src/test/java/com/dietetica/lembas/auth/service/JwtAuthenticationFilterTest.java` -- 6 tests unitarios cubriendo token valido, sin header, header no-Bearer, expirado, malformado y continuidad de filter chain.
- `backend/src/test/java/com/dietetica/lembas/auth/web/AuthControllerTest.java` -- +3 tests MVC slice de login (200, 401, 403) + 1 test `/me`; requirio `@MockitoBean JwtAuthenticationFilter` para que levante el contexto.
- `backend/src/test/java/com/dietetica/lembas/auth/integration/AuthLoginIntegrationTest.java` -- 8 tests de integracion `@SpringBootTest` + Testcontainers postgres:16-alpine cubriendo login valido, unicidad de tokens, password incorrecto, email inexistente, cuenta deshabilitada, normalizacion de email, verificacion BCrypt, hardening contra raw passwords.
- `backend/src/main/java/com/dietetica/lembas/{auth/service,shared/config}/`, `backend/src/test/java/com/dietetica/lembas/{auth/service,shared/config}/`, `docs/03-architecture/security-architecture.md` -- hardening post-review: refresh tokens ya no autentican endpoints API, `/api/auth/me` requiere JWT segun endpoints.md, stale JWT subjects no generan 500, y normalizacion de email usa `Locale.ROOT`.
- `frontend/src/app/core/services/auth.ts` -- persistencia de JWT access token y usuario autenticado en `localStorage` (claves `lembas_access_token`, `lembas_user`); nuevo metodo `getAccessToken()`; hidratacion de estado al construir el servicio; limpieza en `clearAuth()`.
- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- nuevo: interceptor funcional `HttpInterceptorFn` que agrega header `Authorization: Bearer <token>` a toda request saliente si hay token disponible; respeta headers `Authorization` ya existentes.
- `frontend/src/app/app.config.ts` -- registrado `authInterceptor` en `provideHttpClient(withInterceptors([...]))` antes de `errorInterceptor`.
- `frontend/src/app/core/interceptors/auth-interceptor.spec.ts` -- 5 tests unitarios: attach con token, sin token, preservacion de header existente, request publica sin token, POST con token.
- `frontend/src/app/core/services/auth.spec.ts` -- agregados 5 tests: persistencia token+user, recuperacion token, null sin token, isAuthenticated=true tras persistencia, clearAuth limpia localStorage.
- `frontend/vitest-base.config.ts` -- nuevo: configuracion base de Vitest con `environment: 'jsdom'` para disponibilidad de APIs de navegador.
- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- restringido attachment de JWT solo a requests con URL que comienza con `/api/` para evitar fuga de token a terceros.
- `frontend/src/app/core/services/auth.ts` -- quitado `refreshToken` de `AuthResponse` (no se usa en frontend); `isAuthenticated` ahora verifica tambien existencia de token; constructor limpia stale user data si no hay token; `loadStoredUser()` valida la forma del objeto persistido (id, email, firstName, lastName, role valido) antes de usarlo.
- `frontend/src/app/core/services/auth.spec.ts` -- agregados 5 tests de hidratacion con token+user, token faltante, user malformado, rol invalido; agregado `vi.unstubAllGlobals()` en afterEach.
- `frontend/src/app/core/interceptors/auth-interceptor.spec.ts` -- agregado test que verifica que token no se adjunta a URLs externas.
- `frontend/src/app/features/auth/register/register.spec.ts` -- removido `refreshToken` del mock de `AuthResponse`.
- `frontend/src/app/core/services/auth.ts` -- token de auth movido a un signal interno para que `isAuthenticated` dependa solo de estado reactivo; `saveAuthResponse()` ahora actualiza estado token/user consistentemente; `clearAuth()` resetea ambos; campos opcionales de sucursal persistidos se validan antes de hidratar.
- `frontend/src/app/core/interceptors/auth-interceptor.ts` -- extraida verificacion de URL de API backend en helper `isBackendApiRequest()` para cambios futuros de URL base mas claros.
- `frontend/src/app/core/services/auth.spec.ts` -- deduplicado setup de localStorage con `stubLocalStorage()` y agregada cobertura de campos opcionales de sucursal malformados.
- `frontend/src/app/shared/components/app-{input,form-field,modal,toast,breadcrumb,tabs,pagination,search-bar,data-table,stat-card}/` -- 10 nuevos componentes compartidos genericos, todos wrappers basados en PrimeNG con estilos de disenio Lembas (tokens de DESING.md).
- `frontend/src/app/shared/components/app-{button,page-header,section-card}/`, `confirm-dialog/` -- corregidos font-weights invalidos (>700) a 700 (maximo de Plus Jakarta Sans) y unificado uso de variables CSS.
- `frontend/src/app/shared/components/index.ts` -- exportados los 20 componentes compartidos.
- `frontend/src/app/features/dev/component-showcase/` -- actualizado con demos vivos de todos los componentes nuevos.
- `frontend/src/app/features/public-store/store-layout/` -- rediseniado con canvas crema calido, links de nav pill, badge de carrito, footer Forest Green minimal de una sola fila. Eliminados hero section y Leaf CTA flotante. Icono de carrito cambiado de SVG de canasta a SVG de carrito de compras.
- `frontend/src/app/features/admin/admin-layout/` -- rediseniada sidebar con marca Forest Green, breadcrumbs custom (sin dependencia de PrimeNG), avatar de usuario con verde primario. Mantenida sidebar colapsable y logica de logout existente.
- `frontend/src/app/shared/components/app-store-nav/` -- extraida barra de navegacion generica con marca Lembas: config de marca, links de nav, estado de auth (login/register vs dropdown de usuario), icono de carrito con badge. Inputs para marca/links/carrito/auth, outputs para logout/clickCarrito.
- `frontend/src/app/shared/components/app-store-footer/` -- extraido footer generico minimal de una fila: copyright a la izquierda, links planos inline a la derecha. Inputs para array de links y string de copyright.
- `frontend/src/app/features/public-store/store-layout/` -- refactorizado a shell fino delegando a ambos componentes genericos nuevos.
- `frontend/src/app/shared/components/app-store-nav/` -- reemplazados links de navegacion redundantes (Tienda/Productos) por barra de busqueda `app-search-bar` generica. Agregados inputs `showSearch`, `searchPlaceholder` y output `searchQuery`.
- `frontend/src/app/features/public-store/store-layout/`, `frontend/src/app/features/admin/admin-layout/` -- corregido `userDisplayName` para mostrar solo `firstName` en lugar del email.
- `frontend/src/app/core/services/auth.ts` -- persistido `firstName` en localStorage (`lembas_user_first_name`) para que sobreviva recargas de pagina, ya que el JWT no lo incluye.
- `backend/src/main/java/com/dietetica/lembas/users/`, `backend/src/main/java/com/dietetica/lembas/shared/branch/`, `frontend/src/app/features/admin/users/` -- implementado hardening post-review de gestion admin de usuarios: endpoints solo gestionan roles internos, filtros combinados role+sucursal, bloqueo de deshabilitar ultimo admin, limpieza de sucursal al promover a ADMIN, limpieza de telefono con valor blanco, endpoint admin de sucursales activas y validacion frontend previa al submit. Agregada cobertura backend/frontend para los casos criticos.
- `frontend/src/app/shared/components/app-metric-strip/`, `frontend/src/app/shared/components/app-{page-header,data-table}/`, `frontend/src/app/features/admin/users/` -- mejora visual del panel de usuarios con direccion estetica apothecary-ledger: hero generico mas expresivo, tabla generica refinada, nuevo componente reutilizable de metricas y composicion responsive para futuras paginas admin.
- `frontend/src/app/shared/components/app-{page-header,data-table,metric-strip}/`, `frontend/src/app/features/admin/users/users.css` -- ajustado estilo visual para eliminar gradientes y mantener superficies solidas segun preferencia de UI.

## 2026-05-26

- `frontend/src/app/features/admin/users/users.ts`, `frontend/src/app/features/admin/users/users.html`, `frontend/src/app/features/admin/users/users.css`, `frontend/src/app/features/admin/users/users.spec.ts` -- agregada validacion de formato email en frontend (regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) en `isFormValid()` con 8 tests de aceptacion/rechazo; expuestos signals `formEmailValid`, `formPasswordValid`, `formBranchValid` computados con `formSubmitted` para mostrar errores inline por campo tras el primer intento de submit; errores visuales rojos (`user-form__error`) alineados con paleta de DESING.md.
- `frontend/src/app/shared/components/app-data-table/` -- refactorizado componente generico para soportar toolbar opcional via content projection (`<ng-template #toolbar>`), eliminando necesidad de wrappers externos. Card visual ahora proviene del shell interno, no de contenedores anidados.
- `frontend/src/app/features/admin/users/` -- eliminada arquitectura de "cards sobre cards" (table-shell + data-table con su propio card). Toolbar con titulo/kicker/búsqueda/contador ahora vive dentro del data-table via nuevo slot. Agregada búsqueda client-side con filtrado por nombre/email/rol/sucursal usando `app-search-bar`.
- `backend/src/main/java/com/dietetica/lembas/shared/branch/`, `backend/src/test/java/com/dietetica/lembas/shared/branch/web/BranchAdminControllerTest.java` -- corregido registro del endpoint `GET /api/admin/branches`: removida condicion bean-temprana que dejaba el controller sin mapear en runtime y agregada cobertura MVC de ruteo/autorizacion.
- `docker/compose.yml` -- corregido healthcheck del contenedor web usando `127.0.0.1` en lugar de `localhost` para evitar fallo por resolucion IPv6 contra Nginx escuchando IPv4.
- `docker/nginx.conf`, `frontend/src/app/{app.config.ts,core/interceptors/{auth,error}-interceptor.ts,features/auth/login/login.ts}` -- corregidos problemas de login en navegador: CSP permite Google Fonts, `MessageService` global evita fallo síncrono del interceptor antes de enviar HTTP, login/register no reciben tokens stale, 401 redirige a `/auth/login`, y una falla de navegación post-login ya no se reporta como credenciales/API fallidas ni borra la sesión.
- `frontend/src/app/features/admin/users/` -- ajustada validacion inline post-review: passwords cortas tambien se bloquean al editar, nombre/apellido muestran errores visuales, el estado de validacion se reinicia al abrir dialogos y se removieron dependencias de toast duplicadas.
- `frontend/src/app/core/interceptors/error-interceptor.ts` -- simplificado manejo global de toasts para cubrir solo errores comunes/transversales (red, sesion expirada, acceso denegado, 5xx); errores de formulario/negocio como 400, 404, 409 y login/register quedan para la UI propietaria.
- `frontend/src/app/features/auth/{login,register}/`, `frontend/src/app/features/admin/users/` -- alineado manejo de errores de componentes con la nueva convencion: login/register no duplican errores comunes del interceptor y Users muestra errores de negocio/validacion del backend en el dialogo o toast contextual de estado.
- `frontend/src/app/features/admin/users/` -- redisenado modal de crear/editar usuarios con secciones Identidad/Permisos, layout responsive de dos columnas y `p-select` de sucursal mas robusto (`appendTo=body`, normalizacion number|null, disabled sin sucursales) para evitar recortes/selecciones inestables dentro del dialogo.
- `frontend/src/app/features/admin/users/` -- refinado modal de usuarios: intro de Acceso interno convertida en encabezado compacto sin card, selectores de rol/sucursal con plantillas enriquecidas e indicador de alcance sin cards anidadas.
- `frontend/src/app/core/interceptors/error-interceptor.ts` -- deduplicados toasts globales identicos en una ventana corta para evitar mensajes repetidos cuando fallan requests paralelas (por ejemplo Usuarios + Sucursales). Agregado test de regresion en `error-interceptor.spec.ts`.
- `frontend/src/app/features/admin/users/`, `frontend/src/app/shared/components/app-{data-table,modal,page-header,metric-strip}/` -- redisenada pantalla de Usuarios con layout desktop de workspace + panel operativo, modal en dos columnas y mejoras responsive centralizadas en componentes compartidos.
- `frontend/src/app/shared/components/app-data-table/`, `frontend/src/app/features/admin/users/user-list/` -- conectada la paginacion real de backend en el listado de usuarios internos: `app-data-table` ahora soporta lazy mode, `totalRecords` y opciones de filas; `UserList` solicita pagina/tamano al endpoint `GET /api/admin/users` al cambiar de pagina.
- `backend/src/main/java/com/dietetica/lembas/users/{repository,service,web}/`, `frontend/src/app/{core/services/user.ts,features/admin/users/user-list/}` -- buscador de usuarios migrado a backend con parametro `search` en `GET /api/admin/users`, manteniendo paginacion real y total de resultados; frontend ahora recarga pagina 0 al buscar/limpiar y pagina sobre resultados filtrados del servidor.

- `backend/src/main/java/com/dietetica/lembas/users/repository/UserRepository.java` -- unificado listado y busqueda de usuarios en un solo metodo `findInternalUsers` (JPQL con `:search is null` short-circuit); eliminados 4 derived-query methods redundantes (`findByRoleIn`, `findByRoleAndBranchId`, `findByBranchId`, `findByRoleInAndBranchId`); agregado `computeUserMetrics` (native query con `COUNT(*) FILTER`) y `UserMetricsProjection`; `cast(:search as string)` para evitar errores de inferencia de tipo de PostgreSQL con parametros nulos; nota de performance sobre indice `pg_trgm` para escala >5-10K usuarios.
- `backend/src/main/java/com/dietetica/lembas/users/service/UserAdminService.java` -- `listUsers` simplificado a un solo camino via `findInternalUsers` en vez de 5 branches if/else; `getUserMetrics` ahora usa un solo native query en vez de 3 `countByRoleIn*` separados; `normalizeSearch` mantiene `trim().toLowerCase()` con comentario sobre type-safety.
- `backend/src/main/java/com/dietetica/lembas/users/web/UserAdminController.java` -- nuevo endpoint `GET /api/admin/users/metrics` retornando `UserMetricsResponse`.
- `backend/src/test/java/com/dietetica/lembas/users/repository/UserRepositoryTest.java` -- renombrado `searchInternalUsers` a `findInternalUsers`; nuevo test `findInternalUsersReturnsAllInternalUsersWhenSearchIsNull`; nuevo test `computeUserMetricsExcludesCustomers` verificando exclusion de CUSTOMER y conteo correcto incluyendo seed data; separado `findByEnabledTrue` en test propio.
- `backend/src/test/java/com/dietetica/lembas/users/service/UserAdminServiceTest.java` -- nuevo `@Nested class GetUserMetrics` con mock de `UserMetricsProjection`; corregido mock de busqueda a `findInternalUsers` y `"gandalf"` minuscula.
- `backend/src/test/java/com/dietetica/lembas/users/web/UserAdminControllerTest.java` -- +7 tests para `GET /api/admin/users/metrics` (200 ADMIN, 403 MANAGER, 403 EMPLOYEE, 401 unauthenticated).
- `frontend/src/app/features/admin/users/user-list/user-list.ts` -- `loadMetrics` con `error` callback que muestra toast via `MessageService` en vez de fallar silenciosamente con ceros.
- `docs/05-api/endpoints.md` -- documentado `search` y `metrics` en `GET /api/admin/users`.

## 2026-05-27

- `backend/src/main/java/com/dietetica/lembas/auth/`, `backend/src/main/resources/db/migration/V11__refresh_tokens.sql` -- implementada rotacion real de refresh tokens: tabla `refresh_tokens` con hash SHA-256, endpoint `POST /api/auth/refresh`, invalidacion del token anterior y revocacion defensiva ante reuse.
- `frontend/src/app/core/services/auth.ts`, `frontend/src/app/core/interceptors/auth-interceptor.ts`, `frontend/src/app/app.config.ts` -- el frontend ahora usa el refresh token persistido para renovar sesion ante 401, comparte una unica renovacion para requests paralelas y reintenta la request original con el access token nuevo.
- `backend/src/test/java/com/dietetica/lembas/auth/`, `frontend/src/app/core/` -- agregada cobertura de rotacion, endpoint refresh, persistencia de tokens renovados y retry/limpieza de auth ante fallos de refresh.
- `frontend/src/app/features/public-store/{home,catalog,store-layout}/`, `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/components/store-product-card/` -- redisenada landing y catalogo publico con estética editorial/apotecaria sin gradientes, recomendados en marquee horizontal, card de producto reutilizable, home sin grilla de categorias, corregidos links a `/store/catalog`, busqueda del header y alias `/catalog` para acceso directo.

## 2026-05-27

- `backend/src/main/java/com/dietetica/lembas/catalog/` y tests -- implementado CRUD admin de categorias para S1-US07 con DTOs, validacion de parent/nombre duplicado por nivel, endpoint publico existente y cobertura unitaria.
- `frontend/src/app/features/admin/categories/`, `core/services/category.ts`, rutas/admin layout -- agregada pantalla de administracion de categorias con tabla paginada, formulario modal, validacion en tiempo real, confirmacion de eliminacion y estados loading/error/empty.
- `frontend/src/app/features/public-store/category-nav/`, `public-store/catalog/` -- extraido filtro publico reutilizable de categorias e integrado al catalogo.
- `frontend/src/app/shared/components/hero-flowers/hero-flowers.ts` -- nuevo componente decorativo standalone con 6 hojas SVG del logo Lembas distribuidas homogeneamente en el hero de home y catalogo. Cada hoja usa arquitectura de 2 capas (wrapper posicion estatico + wrapper animacion) para preservar rotacion/scale/flip sin conflicto con keyframes. 3 animaciones sway distintas (translate + delay staggered) con ciclo 6-11s, opacidades 0.04-0.07, responsive (3 hojas ocultas en mobile). Integrado en `home.ts` y `catalog.html`.

## 2026-05-28

- `backend/src/main/java/com/dietetica/lembas/catalog/` y tests -- implementado CRUD admin de productos para S1-US08 con entidad JPA, DTOs, endpoints paginados, validacion de barcode unico/precio/categoria y soft-delete.
- `frontend/src/app/features/admin/products/`, `core/services/product.ts`, `shared/models/{product,page}.ts` -- agregada administracion de productos con listado paginado y filtros, formulario de alta/edicion, preview de imagen, badges de estado online y rutas `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`.
- `backend/src/main/resources/db/migration/V12__seed_products.sql`, `V13__fix_demo_product_categories.sql`, `backend/src/main/java/com/dietetica/lembas/catalog/repository/ProductRepository.java`, `docker/nginx.conf` -- agregados productos demo, corregido 500 de busqueda paginada por casteo de `search` en PostgreSQL y habilitadas imagenes HTTPS en CSP para previews semilla.
- `frontend/src/styles.css`, `frontend/src/app/features/admin/products/` -- unificados `border-radius`, `min-height`, `font-size` y focus-ring de todos los controles PrimeNG (`p-inputtext`, `p-select`, `p-inputnumber`) en un override global para que forms de admin sean homogeneos.
- `frontend/src/app/features/admin/admin-layout/admin-layout.css` -- agrandada sidebar: ancho 16rem, nav links 0.95rem/2.8rem min-height, iconos 1.15rem, spacing generoso, brand 4.2rem.

## 2026-05-29

- `backend/src/main/java/com/dietetica/lembas/catalog/model/ProductOnlineStatus.java` -- agregado metodo `canTransitionTo()` con transiciones controladas: DRAFT->PUBLISHED, PUBLISHED->PAUSED, PAUSED->PUBLISHED|HIDDEN, HIDDEN->PAUSED. Self-transition y null denegados.
- `backend/src/main/java/com/dietetica/lembas/catalog/dto/ProductStatusUpdateRequest.java` -- nuevo DTO record para `PATCH /api/admin/products/{id}/status` con `@NotNull ProductOnlineStatus`.
- `backend/src/main/java/com/dietetica/lembas/catalog/service/ProductService.java` -- agregados `changeOnlineStatus()` (transicion controlada con `PRODUCT_STATUS_INVALID_TRANSITION` 409), `listStoreProducts()` y `getStoreProductDetail()` (solo PUBLISHED).
- `backend/src/main/java/com/dietetica/lembas/catalog/repository/ProductRepository.java` -- agregadas queries publicas `searchStoreProducts()` (solo PUBLISHED, por nombre/descripcion/marca) y `findByIdAndActiveTrueAndOnlineStatus()`.
- `backend/src/main/java/com/dietetica/lembas/catalog/web/ProductAdminController.java` -- nuevo `PATCH /api/admin/products/{id}/status` retornando `ProductSummaryDto` actualizado.
- `backend/src/main/java/com/dietetica/lembas/catalog/web/ProductStoreController.java` -- nuevo controller publico `GET /api/store/products` y `GET /api/store/products/{id}` con filtro PUBLISHED, branchId opcional para futuro stock.
- `backend/src/test/java/com/dietetica/lembas/catalog/model/ProductOnlineStatusTest.java` -- 14 tests cubriendo todas las transiciones validas, invalidas, self-transition y null.
- `backend/src/test/java/com/dietetica/lembas/catalog/service/ProductServiceTest.java` -- +6 tests: cambio de estado valido/invalido/falta producto, listado y detalle store.
- `backend/src/test/java/com/dietetica/lembas/catalog/repository/ProductRepositoryTest.java` -- +6 tests: store solo publicados, filtro por categoria, exclusion de inactivos, busqueda, detalle publico y rechazo de draft.
- `frontend/src/app/shared/components/status-badge/status-badge.ts` -- nuevo componente generico reutilizable `StatusBadge` que mapea un string de estado a label/tone/icon via config dict. Wrappa `AppBadge` internamente. Reutilizable para productos, ordenes, pagos, caja, stock.
- `frontend/src/app/shared/components/status-badge/status-badge.spec.ts` -- 8 tests: label para cada status, fallback a raw string, tono neutral por defecto.
- `frontend/src/app/shared/models/product-status.ts` -- centraliza `PRODUCT_STATUS_BADGES` (label/tone/icon por status) y `PRODUCT_STATUS_ACTIONS` (transiciones permitidas por status, espejo del backend).
- `frontend/src/app/core/services/product.ts` -- nuevo metodo `updateProductStatus()` para `PATCH /api/admin/products/{id}/status`.
- `frontend/src/app/features/admin/products/product-list/product-list.ts` -- integrado flujo de cambio de estado: `statusActions()` genera MenuItem[], `requestStatusChange()` abre confirm dialog, `confirmStatusChange()` llama API y actualiza la fila localmente sin recargar tabla, `cancelStatusChange()` limpia signals. Eliminado `statusBadge()` en favor de `StatusBadge`.
- `frontend/src/app/features/admin/products/product-list/product-list.html` -- reemplazado `app-badge` inline por `app-status-badge` con config. Agregado `p-menu` con acciones de estado por fila (boton sync). Agregado segundo `app-confirm-dialog` para cambio de estado con label dinamico y destructive mode para HIDDEN.
- `frontend/src/app/features/admin/products/product-list/product-list.spec.ts` -- +5 tests: acciones por status, apertura de dialog, llamada a API, no recarga post-exito, limpieza al cancelar.
- `frontend/src/app/shared/components/index.ts` -- exportado `StatusBadge`.
- `frontend/src/app/features/dev/component-showcase/component-showcase.ts` y `.html` -- agregadas demos de `StatusBadge` para productos (4 estados) y ordenes (3 estados) mostrando reusabilidad del componente.
- `backend/src/main/java/com/dietetica/lembas/catalog/web/ProductStoreController.java`, `frontend/src/app/core/services/catalog.ts`, `frontend/src/app/shared/models/product.ts` -- ajustado S1-US10 para dejar stock por sucursal fuera del catalogo inicial: eliminado `branchId` del contrato publico actual, mantenido `availableStock` solo como campo frontend futuro con TODO y actualizados tests para no inventar stock hasta implementar inventory.
- `frontend/src/app/features/public-store/public-store.routes.ts`, `frontend/src/app/features/public-store/home/home.spec.ts` -- alineadas rutas canonicas del catalogo publico a `/store/products` y `/store/products/:id` con redirects legacy, y agregada cobertura unitaria de Home.

## 2026-06-01

- `docs/05-api/{api-guidelines,error-handling}.md`, `docs/03-architecture/backend-architecture.md`, `docs/06-development/backend-conventions.md` -- alineada documentacion de errores S1-US11 con el modelo real `DomainException(code,status,message)` y agregados codigos de negocio Sprint 1 para auth, usuarios, categorias y productos.
- `frontend/src/app/core/interceptors/error-interceptor.ts`, `error-interceptor.spec.ts` -- implementado comportamiento contextual: en store (router.url.startsWith('/store')) redirige a error pages (403→/store/error/403, 500→/store/error/500), en admin muestra toast. Tests reescritos con describe blocks para admin y store context (12 tests).
- `frontend/src/app/shared/components/error-page/error-page.ts` -- agregado soporte para código 403 con título "Acceso denegado" y descripción específica. Refactorizado switch statement para 403/404/500.
- `frontend/src/app/features/public-store/public-store.routes.ts` -- agregada ruta `error/403` con ErrorPage component.
- `frontend/src/app/features/public-store/store-layout/{store-layout.ts,store-layout.html}`, `frontend/src/app/features/auth/{login/login.ts,login.html,register/register.ts,register.html}` -- agregado `<app-toast />` en store-layout, login y register para notificaciones globales. Actualizados specs con MessageService provider.
- Jira LEMBAS-17 (S1-US11) -- completados todos los subtasks: [01] ApiError record, [02] ControllerAdvice, [03] MessageService+Toast, [04] DomainException, [05] VALIDATION_ERROR mapping, [06] Error code mapping (22 códigos), [07] Form validation integration, [08] HttpErrorInterceptor contextual, [09] ToastComponent, [10] ErrorPageComponent (403/404/500), [11] HTTP status handling, [12-13] Tests. LEMBAS-616 cerrado como duplicado de LEMBAS-83.

## 2026-06-02

- `frontend/src/app/shared/components/{app-modal,confirm-dialog}/` -- corregidos dialogos PrimeNG para renderizarse con `appendTo='body'`, evitando que el overlay quede limitado por contenedores transformados por animaciones de ruta; los estilos se hicieron globales para conservar el aspecto al portalizar.
- `frontend/src/styles.css` -- ajustada la animacion global de rutas para no conservar `transform` al finalizar, evitando que modales custom fixed queden centrados respecto al alto del catalogo en vez del viewport visible.

## 2026-06-03

- `backend/src/main/java/com/dietetica/lembas/users/service/UserAdminService.java`, `frontend/src/app/features/admin/users/user-form/`, `frontend/src/app/core/services/error-mapping.ts`, `docs/05-api/error-handling.md` -- prevencion de auto-degradacion de rol: backend bloquea con `SELF_ROLE_CHANGE_FORBIDDEN` (403) cuando un admin intenta cambiar su propio rol via `PUT/PATCH /api/admin/users/{id}`; frontend desactiva el selector de rol y muestra hint "No puede cambiar su propio rol" cuando se edita el propio usuario, y como red de seguridad extra no envia el cambio de rol en el request. Agregado test unitario `Should_rejectSelfRoleChange_when_adminTriesToChangeOwnRole` y mocks de `SecurityContextHelper` en los tests existentes de `updateUser`.
