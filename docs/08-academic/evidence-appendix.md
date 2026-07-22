# Apendice de Evidencia Reproducible

**Autor:** Ignacio Osella -- Legajo 412023
**Proyecto:** Dietetica Lembas -- Sistema de Gestion Comercial Integrada con Comercio Electronico
**Fecha del documento:** Julio 2026

---

## 1. Guia de Reproducibilidad

Esta seccion describe los pasos necesarios para clonar, configurar, compilar y ejecutar todas las verificaciones del sistema desde un entorno limpio.

### 1.1. Requisitos previos

| Herramienta | Version verificada |
|---|---|
| Java JDK | 21 |
| Node.js | 22.14 |
| npm | 11.14.1 |
| Docker Engine | 24+ |
| Docker Compose | 2.x (plugin v2) |
| Git | Cualquier version moderna |

### 1.2. Clonacion y configuracion inicial

```bash
# Clonar el repositorio
git clone <url-del-repositorio> lembas
cd lembas

# Verificar el commit base de las migraciones
git checkout 3afdcab47  # commit de referencia para integridad de migraciones

# Configurar variables de entorno para Docker
cp docker/.env.example docker/.env
```

### 1.3. Compilacion y verificacion del backend

```bash
cd backend

# Compilar sin ejecutar pruebas (verifica compilacion)
./mvnw compile -q

# Ejecucion completa: 920 pruebas, JaCoCo, SpotBugs, ArchUnit, empaquetado
./mvnw clean verify
```

### 1.4. Compilacion y verificacion del frontend

```bash
cd frontend

# Instalar dependencias
npm ci

# Verificacion completa: formato, lint, tipos, 986 pruebas, compilacion produccion
npm run verify

# Medicion de cobertura con umbrales
npm run test:coverage

# Auditoria de dependencias de produccion
npm audit --omit=dev --audit-level=high
```

### 1.5. Verificacion de contenedores

```bash
cd docker

# Validar sintaxis de docker-compose
docker compose --env-file ../docker/.env.example -f compose.yml config --quiet

# Construir imagen del backend
docker build -f backend.Dockerfile -t lembas-backend:verify ..

# Construir imagen del frontend
docker build -f frontend.Dockerfile -t lembas-frontend:verify ..
```

### 1.6. Ejecucion completa del sistema

```bash
cd docker
docker compose --env-file .env -f compose.yml up --build
```

---

## 2. Resultados de Ejecucion de Pruebas

### 2.1. Backend -- Suite de pruebas

| Aspecto | Valor |
|---|---|
| Total de pruebas | 920 |
| Framework | JUnit 5 |
| Mocking | Mockito |
| Contenedores | Testcontainers (PostgreSQL 16) |
| Arquitectura | ArchUnit (7 reglas dinamicas) |
| Integracion HTTP | Spring MVC Test (MockMvc) |
| Compilacion de produccion | ./mvnw package -DskipTests |

**Comando de ejecucion:**

```bash
cd backend && ./mvnw clean verify
```

**Salida esperada (fragmento):**

```
[INFO] Tests run: 920, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] --- jacoco:0.8.12:check (default) @ lembas ---
[INFO] Coverage checks passed.
[INFO]
[INFO] --- spotbugs:4.9.3:check (default) @ lembas ---
[INFO] SpotBugs checks passed.
[INFO]
[INFO] BUILD SUCCESS
```

### 2.2. Frontend -- Suite de pruebas

| Aspecto | Valor |
|---|---|
| Total de pruebas | 986 |
| Framework | Vitest 4 |
| Entorno DOM | jsdom 28 |
| Pruebas de componentes | Angular TestBed (standalone) |
| Archivos de prueba | ~150 archivos .spec.ts |

**Comando de ejecucion:**

```bash
cd frontend && npm run verify
```

**Salida esperada (fragmento):**

```
✓ 986 tests passed
PASS  src/app/...
PASS  src/app/...
...
npm run format:check passed
npm run lint passed
npm run typecheck passed
npm run build passed
```

### 2.3. Cobertura de codigo

| Metrica | Valor actual | Umbral exigido |
|---|---|---|
| Statements (sentencias) | 75.57 % | 75 % |
| Branches (ramas) | 74.67 % | 74 % |
| Functions (funciones) | 55.61 % | 55 % |
| Lines (lineas) | 78.42 % | 78 % |

**Comando de verificacion:**

```bash
cd frontend && npm run test:coverage
```

Los umbrales se encuentran definidos en el archivo de configuracion de Vitest (`vitest.config.ts`) y se validan mediante `@vitest/coverage-v8`. Todos los umbrales se cumplen en la linea base actual.

---

## 3. Resultados de Compuertas de Calidad

Cada compuerta de calidad se ejecuta de forma independiente y secuencial para evitar presion de memoria RAM.

### 3.1. Backend

| Compuerta | Comando | Estado |
|---|---|---|
| Pruebas + JaCoCo + SpotBugs + ArchUnit | `cd backend && ./mvnw clean verify` | 920 pruebas, 0 fallos |
| Compilacion de produccion | `cd backend && ./mvnw package -DskipTests` | Exito |

### 3.2. Frontend

| Compuerta | Comando | Estado |
|---|---|---|
| Formato (Prettier) | `cd frontend && npm run format:check` | Sin diferencias |
| Lint (ESLint) + fronteras | `cd frontend && npm run lint` | 0 errores, 0 advertencias |
| Verificacion de tipos (app) | `cd frontend && tsc -p tsconfig.app.json --noEmit` | Exito |
| Verificacion de tipos (spec) | `cd frontend && tsc -p tsconfig.spec.json --noEmit` | Exito |
| Pruebas unitarias | `cd frontend && npm test` | 986 pruebas |
| Compilacion produccion | `cd frontend && npm run build` | Exito |
| Cobertura | `cd frontend && npm run test:coverage` | Umbrales cumplidos |
| Auditoria de dependencias | `cd frontend && npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |

### 3.3. Contenedores

| Compuerta | Comando | Estado |
|---|---|---|
| Validacion de Compose | `docker compose --env-file docker/.env.example -f docker/compose.yml config --quiet` | Sintaxis valida |
| Construccion imagen backend | `docker build -f docker/backend.Dockerfile -t lembas-backend:verify .` | Exito |
| Construccion imagen frontend | `docker build -f docker/frontend.Dockerfile -t lembas-frontend:verify .` | Exito |

---

## 4. Resultados de Verificacion Arquitectonica

### 4.1. Reglas ArchUnit (backend)

El archivo `ModularArchitectureTest.java` en `backend/src/test/java/com/dietetica/lembas/architecture/` define las siguientes reglas, todas verificadas con exito:

| # | Regla | Descripcion | Estado |
|---|---|---|---|
| 1 | `controllersDoNotDependOnRepositories` | Los controladores (anotados con `@RestController` o `@Controller`) no deben depender directamente de repositorios. | VERIFICADO |
| 2 | `modelPackagesDoNotDependOnWebPackages` | Las clases del paquete `model` no deben depender de clases del paquete `web`. | VERIFICADO |
| 3 | `sharedPackagesDoNotDependOnFeatureModules` | El paquete `shared` no debe depender de modulos funcionales, con una unica excepcion documentada. | VERIFICADO |
| 4 | `productionCodeDoesNotUseFieldInjection` | No se permite inyeccion por campo (`@Autowired`, `@Inject`, `@Resource`, etc.) en codigo de produccion. | VERIFICADO |
| 5 | `crossModuleRepositoryAccessIsExplicitlyAllowlisted` | Ningun modulo puede acceder a repositorios de otro modulo sin estar en la lista de permitidos explicita. | VERIFICADO |
| 6 | `webPackagesDependInward` | Las clases del paquete `web` solo pueden depender hacia adentro (servicios, DTOs, modelos, API) del mismo modulo o de modulos compartidos. | VERIFICADO |
| 7 | `controllerMethodsDoNotExposeJpaEntities` | Los metodos de controladores no deben exponer entidades JPA en sus firmas (tipos de retorno). | VERIFICADO |

**Listas de permitidos:**

Todas las listas de permitidos estan **vaciamente vacias**, lo que significa que ninguna violacion esta tolerada:

| Lista de permitidos | Estado |
|---|---|
| `CROSS_MODULE_REPOSITORY_ALLOWLIST` | VACIA -- ningun modulo accede a repositorios de otro modulo |
| `CONTROLLER_REPOSITORY_ALLOWLIST` | VACIA -- ningun controlador accede directamente a repositorios |
| `FIELD_INJECTION_ALLOWLIST` | VACIA -- no existe inyeccion por campo en produccion |
| `SHARED_FEATURE_ALLOWLIST` | UNICA EXCEPCION: `SecurityConfig` -> `JwtAuthenticationFilter` (cableado de infraestructura de seguridad) |

La unica excepcion en todo el sistema es la relacion entre `shared.config.SecurityConfig` y `auth.service.JwtAuthenticationFilter`, necesaria para el cableado del filtro de autenticacion JWT. Esta excepcion esta explicitamente documentada en el codigo y corresponde a infraestructura transversal, no a logica de negocio.

### 4.2. Verificador de fronteras (frontend)

El script `check-feature-boundaries.mjs` en `frontend/scripts/` analiza todas las importaciones de TypeScript en produccion (excluyendo archivos `.spec.ts`) y rechaza tres tipos de violaciones:

| Regla | Descripcion |
|---|---|
| `CORE_TO_FEATURE` | El nucleo (`core/`) no puede importar desde modulos funcionales (`features/`). |
| `SHARED_TO_CORE_OR_FEATURE` | El modulo compartido (`shared/`) no puede importar desde `core/` ni `features/`. |
| `FEATURE_PRIVATE_IMPORT` | Un modulo funcional no puede importar directorios privados (`state/`, `ui/`, `presentation/`, `pages/`) de otro modulo funcional. Solo se permite la importacion a traves del archivo `public-api.ts`. |

**Estado actual:** SIN VIOLACIONES.

Cada uno de los 10 modulos funcionales expone un archivo `public-api.ts`:

```
frontend/src/app/features/branches/public-api.ts
frontend/src/app/features/cash/public-api.ts
frontend/src/app/features/catalog/public-api.ts
frontend/src/app/features/checkout/public-api.ts
frontend/src/app/features/dashboard/public-api.ts
frontend/src/app/features/inventory/public-api.ts
frontend/src/app/features/orders/public-api.ts
frontend/src/app/features/public-store/public-api.ts
frontend/src/app/features/reports/public-api.ts
frontend/src/app/features/suppliers/public-api.ts
```

**Comando de verificacion:**

```bash
cd frontend && npm run boundaries
```

**Salida esperada:** `Frontend boundary check passed.`

---

## 5. Integridad de Migraciones Flyway

### 5.1. Migraciones verificadas

El directorio `backend/src/main/resources/db/migration/` contiene 31 migraciones versionadas, desde `V1__core.sql` hasta `V31__order_item_category_snapshots.sql`. Ninguna ha sido modificada desde el commit base `3afdcab47`.

```
V1__core.sql
V2__catalog.sql
V10__seed_data.sql
V11__refresh_tokens.sql
V12__seed_products.sql
V13__fix_demo_product_categories.sql
V14__seed_more_products.sql
V15__seed_many_categories.sql
V16__seed_demo_users.sql
V17__add_active_and_audit_to_categories.sql
V18__inventory.sql
V19__inventory_purchasing_links.sql
V20__suppliers.sql
V21__seed_suppliers.sql
V22__purchase_orders.sql
V23__purchase_receipts.sql
V24__pricing_batches.sql
V25__orders.sql
V26__payments.sql
V27__cash.sql
V28__orders_cash_session.sql
V29__add_ready_at_to_orders.sql
V30__seed_report_demo_data.sql
V31__order_item_category_snapshots.sql
```

### 5.2. Verificacion de inmutabilidad

```bash
git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration
```

**Resultado:** Sin diferencias (codigo de salida 0). Esto confirma que ninguna migracion existente ha sido editada, renombrada o eliminada desde el commit de referencia. Cualquier cambio futuro en el esquema debe realizarse exclusivamente mediante una nueva migracion versionada (`V32__...`).

El sistema utiliza `ddl-auto: validate` en JPA/Hibernate, lo que significa que en cada inicio se verifica que el mapeo de entidades coincida con el esquema definido por las migraciones. Cualquier discrepancia impide el inicio de la aplicacion.

---

## 6. Invarianzas de Dominio Verificadas en Codigo

Las siguientes reglas de negocio han sido implementadas y verificadas mediante pruebas automatizadas:

| # | Invarianza | Implementacion | Cobertura de pruebas |
|---|---|---|---|
| 1 | Modelo de pedido unificado: `type=POS|ONLINE` | Campo `order_type` en tabla `orders`; enumeracion `OrderType` | Integracion: ciclo de vida POS y ONLINE |
| 2 | FEFO: `expiration_date ASC NULLS LAST` | Consulta JPQL en `StockLotRepository` con `ORDER BY expiration_date ASC NULLS LAST` | Prueba unitaria de politica FEFO |
| 3 | Stock deducido al confirmar el pago, no al crear el pedido | Logica en `OrderPaymentService` / `InventoryApplicationService` | Integracion: confirmacion de pago sin deduccion previa |
| 4 | Deduccion ONLINE: pre-vuelo de demanda agregada, bloqueo deterministico de lotes, sin mutacion parcial | Metodo `preflightAndDeductStock` con `SELECT ... FOR UPDATE` | Prueba de concurrencia: `STOCK_CONFLICT` sin deduccion parcial |
| 5 | Idempotencia de webhook por `provider_payment_id` | Busqueda previa en `PaymentRepository` antes de procesar | Prueba de concurrencia: webhook duplicado |
| 6 | POS: pedido `PAID`; `cash_session_id` requerido en tienda, nulo en ONLINE | Validacion en `PosController` / `OrderValidator` | Integracion: creacion de pedido POS vs ONLINE |
| 7 | Arqueo de caja: concilia solo metodo `CASH` | Filtro en `CashCloseService`; otros metodos son informativos | Integracion: cierre con discrepancia |
| 8 | Recepcion de compra: bloquea la orden, no puede sobre-recibir en concurrente | `SELECT ... FOR UPDATE` en `PurchaseReceiptService` | Prueba de concurrencia: sobre-recepcion |
| 9 | `DELIVERED` = entregado en sucursal (solo recogida) | Maquina de estados en `OrderStateMachine` | Integracion: ciclo de vida completo |
| 10 | `supplier_products` unico por `(product_id, supplier_id)` | `UNIQUE` constraint en tabla `supplier_products` | Prueba de integridad referencial |

### Pruebas de concurrencia critica

Todas las pruebas de concurrencia utilizan `CountDownLatch` y `CyclicBarrier` con `TransactionTemplate` para coordinar hilos, nunca `Thread.sleep()`. Las pruebas verifican:

- **Webhook duplicado**: dos notificaciones simultaneas con el mismo `provider_payment_id` -- solo una debe procesarse.
- **Cancelacion/reembolso**: la restauracion de stock revierte exactamente los mismos lotes consumidos, sin condiciones de carrera.
- **Cierre de caja**: dos cierres simultaneos sobre la misma sesion -- solo uno debe tener exito (`FOR UPDATE`).
- **Recepcion de compra**: dos recepciones concurrentes sobre la misma orden de compra -- ninguna puede sobre-repasar la cantidad ordenada.
- **Conflicto de stock ONLINE**: deduccion que falla por stock insuficiente debe quedar como `STOCK_CONFLICT`, sin pasar por `PAID` ni mutar stock parcialmente.

---

## 7. Limitaciones Conocidas y Validacion Externamente Bloqueada

Las siguientes areas no pueden verificarse sin credenciales, DNS, CI o infraestructura de produccion:

### 7.1. Integracion con Mercado Pago

- La suite de pruebas unitarias e integracion cubre el procesamiento de webhooks con firmas simuladas y el flujo de creacion de preferencias de pago.
- La validacion de firmas HMAC-SHA256 reales de Mercado Pago requiere el `x-signature` generado por el servidor de Mercado Pago, lo cual solo ocurre en produccion o en un entorno sandbox con configuracion real de credenciales.
- Las pruebas de idempotencia se realizan a nivel de logica de aplicacion, no contra el endpoint real de Mercado Pago.
- El callback de redireccion post-pago (`/api/webhooks/mercado-pago/success`) solo es invocable en un escenario de produccion o sandbox con credenciales.

### 7.2. DNS y TLS

- La validacion de `Secure=true` en cookies JWT solo se fuerza en el perfil de produccion.
- La configuracion de Nginx para TLS, redireccion HTTP->HTTPS y denial de TRACE requiere certificados y DNS reales.
- `docker/nginx.conf` incluye la directiva `proxy_set_header Host $host` y la negacion de TRACE, pero la validacion funcional completa requiere un dominio real.

### 7.3. CI/CD

- No existe pipeline automatizado de CI (GitHub Actions, GitLab CI, etc.) configurado en este repositorio. Todas las compuertas se ejecutan localmente.
- Las verificaciones de acciones de terceros (SHA de acciones de GitHub, etc.) son responsabilidad del despliegue, no del codigo fuente.

### 7.4. Credenciales y secretos

- `docker/.env` contiene valores de ejemplo. Las credenciales reales de base de datos, Mercado Pago (`ACCESS_TOKEN`, `WEBHOOK_SECRET`) y JWT (`JWT_SECRET`) deben configurarse en el entorno de produccion.
- Ningun secreto real aparece en el codigo fuente ni en el historial de Git. Esto se verifica mediante inspeccion manual.

### 7.5. Metricas de produccion

- No existen datos de rendimiento en produccion (tiempos de respuesta, throughput, tasas de error).
- No existen metricas de uso real (usuarios activos, pedidos procesados, volumen de stock).
- No existen capturas de pantalla ni evidencia visual del sistema en funcionamiento fuera de las pruebas automatizadas.

---

## 8. Referencia de Comandos de Validacion

La siguiente tabla resume todos los comandos utilizados para la validacion documental del sistema:

| Comando | Proposito | Salida esperada |
|---|---|---|
| `cd backend && ./mvnw clean verify` | Pruebas, cobertura, estatico, empaquetado | BUILD SUCCESS, 0 fallos |
| `cd backend && ./mvnw package -DskipTests` | Compilacion de produccion | BUILD SUCCESS |
| `cd frontend && npm ci` | Instalacion limpia de dependencias | Sin errores |
| `cd frontend && npm run format:check` | Verificacion de formato Prettier | Sin diferencias |
| `cd frontend && npm run boundaries` | Verificacion de fronteras entre modulos | `Frontend boundary check passed.` |
| `cd frontend && npm run lint` | Analisis estatico ESLint + fronteras | 0 errores, 0 advertencias |
| `cd frontend && npm run typecheck` | Verificacion de tipos TypeScript | Exito |
| `cd frontend && npm test` | Pruebas unitarias Vitest | 986 tests passed |
| `cd frontend && npm run test:coverage` | Cobertura con umbrales | Coverage checks passed |
| `cd frontend && npm run build` | Compilacion de produccion Angular | Exito |
| `cd frontend && npm audit --omit=dev --audit-level=high` | Auditoria de dependencias | 0 vulnerabilidades |
| `cd frontend && npm run verify` | Compuerta completa frontend | Exito en todas las etapas |
| `docker compose --env-file docker/.env.example -f docker/compose.yml config --quiet` | Validacion de sintaxis Compose | Sin salida (codigo 0) |
| `docker build -f docker/backend.Dockerfile -t lembas-backend:verify .` | Construccion imagen backend | Exito |
| `docker build -f docker/frontend.Dockerfile -t lembas-frontend:verify .` | Construccion imagen frontend | Exito |
| `git diff --exit-code 3afdcab47 -- backend/src/main/resources/db/migration` | Integridad de migraciones Flyway | Sin diferencias (codigo 0) |

---

## 9. Versiones de Herramientas

| Componente | Version |
|---|---|
| Java | 21 |
| Spring Boot | 3.5.0 |
| Maven Wrapper | ./mvnw (Maven 3.9+) |
| Angular | 21.2.18 (standalone) |
| PrimeNG | 21.1.7 (tema Aura) |
| Tailwind CSS | 4.3 |
| PostgreSQL | 16 |
| Flyway | Gestionado por Spring Boot 3.5.0 |
| Node.js | 22.14 |
| npm | 11.14.1 |
| Vitest | 4.0.8 |
| jsdom | 28.0.0 |
| ArchUnit | Gestionado por Maven |
| JaCoCo | 0.8.12 |
| SpotBugs | 4.9.3 |
| Chart.js | 4.5.1 |
| Docker Compose | 2.x |
| Nginx | Imagen oficial (Docker) |

---

*Fin del apendice de evidencia reproducible.*
