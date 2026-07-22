# Matrices de Trazabilidad del Sistema Lembas

**Autor:** Ignacio Osello  
**Legajo:** 412023  
**Proyecto:** Sistema Integrado de Gestion Comercial con E-commerce para Dietetica Lembas  
**Fecha:** Julio 2026

---

## Tabla de contenidos

1. [Matriz de Requisitos Funcionales](#1-matriz-de-requisitos-funcionales)
2. [Matriz de Requisitos No Funcionales](#2-matriz-de-requisitos-no-funcionales)
3. [Matriz de Endpoints de API](#3-matriz-de-endpoints-de-api)
4. [Matriz de Codigos de Error](#4-matriz-de-codigos-de-error)
5. [Matriz de Flujos Criticos a Probar](#5-matriz-de-flujos-criticos-a-probar)

---

## 1. Matriz de Requisitos Funcionales

La siguiente tabla presenta veinte (20) requisitos funcionales representativos del sistema, trazando cada uno desde su identificador hasta las pruebas de aceptacion correspondientes. Cada requisito describe una capacidad del sistema que un actor puede ejercer, indicando el modulo backend responsable, las rutas frontend asociadas, los endpoints de API, las entidades de base de datos involucradas y los archivos de prueba que verifican su correcta implementacion.

| ID | Requisito | Actor | Modulo Backend | Rutas Frontend | Endpoints API | Entidades BD | Pruebas de Aceptacion |
|---|---|---|---|---|---|---|---|
| RF-01 | **Registro de cliente** | Cliente no autenticado | auth | `/auth/register` | `POST /api/auth/register` | `users` | `AuthRegistrationIntegrationTest.java`, `AuthDtoValidationTest.java`, `register.spec.ts` |
| RF-02 | **Inicio de sesion y emision de JWT** | Cliente, empleado, administrador | auth | `/auth/login` | `POST /api/auth/login`, `POST /api/auth/refresh` | `users`, `refresh_tokens` | `AuthLoginIntegrationTest.java`, `AuthControllerTest.java`, `JwtTokenProviderTest.java`, `login.spec.ts` |
| RF-03 | **Navegacion del catalogo publico** | Visitante no autenticado | catalog | `/store`, `/store/product/:id`, `/store/categories` | `GET /api/store/products`, `GET /api/store/products/{id}`, `GET /api/store/products/featured`, `GET /api/store/products/{id}/related`, `GET /api/store/categories` | `products`, `categories` | `ProductStoreControllerTest.java`, `CategoryStoreControllerTest.java`, `catalog.spec.ts`, `product-detail.spec.ts` |
| RF-04 | **Gestion de productos (ABMC)** | Administrador, gerente | catalog | `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit` | `GET /api/admin/products`, `POST /api/admin/products`, `GET /api/admin/products/{id}`, `PUT /api/admin/products/{id}`, `DELETE /api/admin/products/{id}`, `PATCH /api/admin/products/{id}/status` | `products`, `categories`, `product_sale_price_history` | `ProductAdminControllerTest.java`, `ProductServiceTest.java`, `product-form.spec.ts`, `product-list.spec.ts` |
| RF-05 | **Gestion de categorias (ABMC)** | Administrador, gerente | catalog | `/admin/products` | `GET /api/admin/categories`, `POST /api/admin/categories`, `PUT /api/admin/categories/{id}`, `DELETE /api/admin/categories/{id}` | `categories` | `CategoryAdminControllerTest.java`, `CategoryServiceTest.java`, `category-form.spec.ts`, `category-list.spec.ts` |
| RF-06 | **Ingreso de stock por compra** | Administrador, gerente, empleado | inventory, suppliers | `/admin/stock/entry`, `/admin/receipts` | `POST /api/admin/stock/receipts` | `stock_lots`, `stock_movements`, `purchase_receipts`, `purchase_receipt_items` | `PurchaseReceiptEntryServiceTest.java`, `StockReceiptAdminControllerTest.java`, `stock-entry.spec.ts` |
| RF-07 | **Deduccion FEFO de stock** | Sistema (automatico) | inventory | - (logica interna) | `POST /api/admin/stock/deductions` | `stock_lots`, `stock_movements` | `FefoStockDeductionPolicyTest.java`, `InventoryStockCommandServiceTest.java`, `StockDeductionServicePosContractTest.java` |
| RF-08 | **Venta en mostrador (POS)** | Empleado, gerente, administrador | pos, cash, orders, inventory | `/admin/pos` | `POST /api/pos/sales`, `GET /api/pos/products/search` | `orders`, `order_items`, `stock_lots`, `stock_movements`, `payments`, `cash_sessions` | `PosSaleIntegrationTest.java`, `PosSaleServiceTest.java`, `pos.spec.ts` |
| RF-09 | **Compra online con Mercado Pago** | Cliente autenticado | payments, orders, inventory | `/customer/orders`, `/customer/orders/:id`, `/customer/payment/callback` | `POST /api/customer/orders`, `POST /api/customer/orders/{orderId}/payments/preference` | `orders`, `order_items`, `payments` | `CustomerOrderServiceTest.java`, `CustomerOrderControllerTest.java`, `PreferenceServiceTest.java`, `checkout.spec.ts` |
| RF-10 | **Procesamiento de webhook de Mercado Pago** | Sistema (Mercado Pago) | payments, orders, inventory | - (callback externo) | `POST /api/webhooks/mercadopago` | `payments`, `orders`, `stock_lots`, `stock_movements` | `MercadoPagoWebhookProcessorTest.java`, `PaymentWebhookTransactionIntegrationTest.java`, `WebhookOrderEffectApplierTest.java`, `WebhookSignatureValidatorTest.java` |
| RF-11 | **Apertura de caja** | Empleado, gerente, administrador | cash | `/admin/cash/open` | `POST /api/admin/cash-sessions/open` | `cash_sessions` | `CashServiceTest.java`, `CashSessionControllerTest.java`, `cash-open.spec.ts` |
| RF-12 | **Cierre de caja con arqueo** | Empleado, gerente, administrador | cash | `/admin/cash/:id/close` | `POST /api/admin/cash-sessions/{id}/close` | `cash_sessions`, `cash_movements`, `payments` | `CashServiceCloseTest.java`, `CashCloseCalculatorTest.java`, `cash-close.spec.ts` |
| RF-13 | **Preparacion y entrega de pedidos online** | Empleado, gerente, administrador | orders | `/admin/orders/:id` | `PATCH /api/admin/orders/{id}/prepare`, `PATCH /api/admin/orders/{id}/ready`, `PATCH /api/admin/orders/{id}/delivered` | `orders`, `order_items` | `AdminOrderServiceTest.java`, `AdminOrderControllerTest.java`, `orders.spec.ts` |
| RF-14 | **Cancelacion de pedido con contraccion de stock** | Empleado, gerente, administrador | orders, inventory | `/admin/orders/:id` | `PATCH /api/admin/orders/{id}/cancel` | `orders`, `payments`, `stock_lots`, `stock_movements` | `AdminOrderCancellationConcurrencyIntegrationTest.java`, `AdminOrderServiceTest.java`, `order-detail-page.spec.ts` |
| RF-15 | **Gestion de proveedores (ABMC)** | Administrador, gerente | suppliers | `/admin/suppliers` | `GET /api/admin/suppliers`, `POST /api/admin/suppliers`, `PUT /api/admin/suppliers/{id}`, `DELETE /api/admin/suppliers/{id}` | `suppliers` | `SupplierAdminControllerTest.java`, `SupplierServiceTest.java`, `suppliers.spec.ts` |
| RF-16 | **Gestion de ordenes de compra** | Administrador, gerente | suppliers | `/admin/purchase-orders` | `GET /api/admin/purchase-orders`, `POST /api/admin/purchase-orders`, `PATCH /api/admin/purchase-orders/{id}/confirm`, `PATCH /api/admin/purchase-orders/{id}/send`, `PATCH /api/admin/purchase-orders/{id}/cancel`, `GET /api/admin/purchase-orders/{id}/pdf` | `purchase_orders`, `purchase_order_items`, `suppliers` | `PurchaseOrderServiceTest.java`, `PurchaseOrderAdminControllerTest.java`, `purchase-orders.spec.ts` |
| RF-17 | **Actualizacion masiva de precios por lote** | Administrador, gerente | suppliers | `/admin/pricing` | `POST /api/admin/price-update-batches/import`, `POST /api/admin/price-update-batches/manual`, `POST /api/admin/price-update-batches/validate`, `POST /api/admin/price-update-batches/apply` | `price_update_batches`, `price_update_batch_items`, `supplier_products`, `products`, `product_sale_price_history`, `supplier_product_cost_history` | `PriceUpdateBatchServiceTest.java`, `PriceUpdateCalculationServiceTest.java`, `PriceUpdateImportServiceTest.java`, `PriceUpdateBatchAdminControllerTest.java`, `price-update-workflow.spec.ts` |
| RF-18 | **Visualizacion de reportes gerenciales** | Administrador, gerente | reports | `/admin/reports`, `/admin/reports/cash`, `/admin/dashboard` | `GET /api/admin/reports/dashboard`, `GET /api/admin/reports/cash-overview`, `GET /api/admin/reports/sales`, `GET /api/admin/reports/employees`, `GET /api/admin/reports/inventory`, `GET /api/admin/reports/suppliers` | `orders`, `payments`, `stock_movements`, `cash_sessions`, `products`, `suppliers` | `ReportServiceTest.java`, `ReportAdminControllerTest.java`, `ReportQueryRepositoryTest.java`, `reports.spec.ts`, `dashboard.spec.ts` |
| RF-19 | **Recomendaciones inteligentes basadas en reglas** | Administrador, gerente | reports | `/admin/recommendations` | `GET /api/admin/recommendations` | `products`, `stock_lots`, `stock_movements`, `supplier_products` | `RecommendationServiceTest.java`, `RecommendationAdminControllerTest.java`, `recommendations-panel.spec.ts` |
| RF-20 | **Gestion de usuarios internos** | Administrador | users | `/admin/users` | `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/{id}`, `PATCH /api/admin/users/{id}/status` | `users`, `branches` | `UserAdminServiceTest.java`, `UserAdminControllerTest.java`, `users.spec.ts` |

---

## 2. Matriz de Requisitos No Funcionales

La siguiente matriz documenta los atributos de calidad del sistema, las tacticas arquitectonicas empleadas para satisfacerlos, los metodos de verificacion aplicados y el estado actual de implementacion.

| ID | Atributo de Calidad | Descripcion | Tactica Arquitectonica | Metodo de Verificacion | Estado |
|---|---|---|---|---|---|
| RNF-01 | **Seguridad - Autenticacion** | El sistema debe verificar la identidad de los usuarios mediante credenciales seguras sin almacenar sesiones en el servidor. | JWT stateless con tokens de acceso y refresh en cookies HttpOnly con SameSite=Strict; contrase as hasheadas con BCrypt; filtro `JwtAuthenticationFilter` en la cadena de seguridad. | `JwtTokenProviderTest.java`, `AuthLoginIntegrationTest.java`, `SecurityConfigTest.java`, `ProductionSecurityConfigurationTest.java` | Implementado |
| RNF-02 | **Seguridad - Autorizacion** | El sistema debe restringir el acceso a recursos segun el rol del usuario (CUSTOMER, EMPLOYEE, MANAGER, ADMIN). | RBAC con `@PreAuthorize` y `SecurityFilterChain`; espacios de URL separados (`/api/customer/`, `/api/admin/`, `/api/pos/`); guards en frontend (`AuthGuard`, `AdminGuard`, `CustomerGuard`). | `SecurityConfigTest.java`, `admin-guard.spec.ts`, `auth-guard.spec.ts`, `customer-guard.spec.ts`, `auth-interceptor.spec.ts` | Implementado |
| RNF-03 | **Seguridad - Proteccion de origen** | El sistema debe rechazar solicitudes HTTP inseguras con origen no autorizado para prevenir CSRF. | `OriginValidationFilter` para metodos inseguros en `/api/`; CSRF deshabilitado pero mitigado por SameSite=Strict + validacion de origen. | `ProductionSecurityConfigurationTest.java` | Implementado |
| RNF-04 | **Rendimiento - Paginacion** | Las consultas de listados deben responder en tiempo constante independientemente del volumen de datos. | Paginacion obligatoria (parametros `page`, `size`, `sort`) en todos los endpoints de listado; tamanio maximo de pagina limitado a 100 elementos. | `PageResponseTest.java`, verificado en pruebas de controladores (`ProductAdminControllerTest.java`, etc.) | Implementado |
| RNF-05 | **Rendimiento - Indexacion** | Las consultas frecuentes a la base de datos deben ejecutarse mediante indices para evitar escaneos secuenciales. | Indices compuestos en `stock_lots (product_id, branch_id, status, expiration_date)` para FEFO; indices en `products (barcode)`, `orders (status, type, branch_id)`, `payments (provider_payment_id)` y demas tablas. | `ReportQueryRepositoryTest.java` (verifica planes de consulta), revision de migraciones Flyway | Implementado |
| RNF-06 | **Confiabilidad - Consistencia de stock** | El sistema debe garantizar que dos transacciones concurrentes no puedan deducir el mismo stock. | Bloqueo pesimista (`SELECT ... FOR UPDATE`) sobre `stock_lots` en todas las operaciones de deduccion; `@Transactional` con aislamiento READ_COMMITTED. | `AdminOrderCancellationConcurrencyIntegrationTest.java`, `InventoryStockCommandServiceTest.java`, `PosSaleIntegrationTest.java` | Implementado |
| RNF-07 | **Confiabilidad - Idempotencia de webhook** | El procesamiento de notificaciones duplicadas de Mercado Pago no debe producir efectos secundarios multiples. | Verificacion de idempotencia por `provider_payment_id` antes de cualquier efecto secundario; el segundo llamado retorna 200 sin mutar estado. | `PaymentWebhookTransactionIntegrationTest.java`, `MercadoPagoWebhookProcessorTest.java` | Implementado |
| RNF-08 | **Confiabilidad - Integridad referencial** | La base de datos debe mantener la integridad referencial y aplicar restricciones de dominio. | Claves foraneas, restricciones CHECK (estados, montos no negativos, cantidades positivas), UNIQUE (barcode, CUIT, email, producto-proveedor); migraciones Flyway inmutables. | `CashSchemaIntegrationTest.java`, `OrderSchemaIntegrationTest.java`, `PaymentSchemaIntegrationTest.java` | Implementado |
| RNF-09 | **Mantenibilidad - Monolito modular** | El sistema debe estar organizado en modulos por funcionalidad de negocio, no por capas tecnicas, para facilitar la navegacion y eventual extraccion a microservicios. | Paquetes por feature (`auth`, `catalog`, `inventory`, `orders`, etc.) con `api/` para contratos entre modulos; prohibicion de acceso a repositorios de otros modulos. | `ModularArchitectureTest.java` (ArchUnit), `npm run boundaries` en frontend | Implementado |
| RNF-10 | **Mantenibilidad - Separacion de capas** | Los controladores no deben contener logica de negocio; las entidades JPA no deben exponerse en la API. | Patron controlador-servicio-repositorio; uso obligatorio de DTOs en los limites HTTP; mapeo explícito entre entidades y DTOs. | `ProductAdminControllerTest.java` (verifica uso de DTOs en respuestas), revision de codigo | Implementado |
| RNF-11 | **Testabilidad - Cobertura** | El sistema debe mantener umbrales minimos de cobertura de codigo para garantizar la calidad. | Gate de cobertura en `pom.xml` (sentencias 75%, ramas 74%, funciones 55%, lineas 78%); metricas verificadas por JaCoCo en `mvn verify`. | `mvn clean verify` (verifica cobertura actual: 75.57% sentencias, 74.67% ramas, 55.61% funciones, 78.42% lineas) | Implementado |
| RNF-12 | **Testabilidad - Pruebas de integracion** | Las pruebas que interactuan con la base de datos deben ejecutarse contra un motor real sin acoplamiento a la base de desarrollo. | Testcontainers con PostgreSQL 16; `AbstractIntegrationTest.java` como clase base; `TestcontainersConfiguration.java` para configuracion. | Verificado por ejecucion de `mvn test` (920 pruebas backend) | Implementado |
| RNF-13 | **Usabilidad - Diseno responsivo** | La interfaz debe adaptarse a dispositivos moviles y de escritorio. | Tailwind CSS con breakpoints responsive; diseno mobile-first; layout adaptable en componentes PrimeNG y personalizados. | Revision visual en diferentes resoluciones; pruebas de componentes con `jsdom` | Implementado |
| RNF-14 | **Usabilidad - Manejo de estados** | Toda vista debe cubrir los estados de carga, vacio, error y datos. | Patron de estados (loading/empty/error/data) en todos los componentes; `loading-spinner`, `empty-state`, `error-alert`, `skeleton` como componentes compartidos. | `loading-spinner.spec.ts`, `empty-state.spec.ts`, `error-alert.spec.ts`, `skeleton.spec.ts` | Implementado |
| RNF-15 | **Portabilidad - Ejecucion en contenedores** | El sistema debe poder desplegarse mediante Docker Compose con configuracion minima. | Dockerfiles multi-etapa para backend (JAR) y frontend (Nginx); `compose.yml` con PostgreSQL, backend y frontend; imagenes no-root. | `docker compose config --quiet`, `docker build` verificado para ambos artefactos | Implementado |

---

## 3. Matriz de Endpoints de API

La siguiente tabla enumera la totalidad de los endpoints REST expuestos por el backend, indicando el modulo responsable, el controlador y servicio subyacentes, los requisitos de autenticacion y los codigos de error especificos que puede retornar cada endpoint.

### 3.1 Autenticacion

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | auth | `AuthController` | `AuthService` | Publico | `EMAIL_DUPLICATED` (409), `VALIDATION_ERROR` (400) |
| POST | `/api/auth/login` | auth | `AuthController` | `AuthService` | Publico | `INVALID_CREDENTIALS` (401), `ACCOUNT_DISABLED` (403) |
| POST | `/api/auth/refresh` | auth | `AuthController` | `AuthService` | Publico (cookie) | `INVALID_REFRESH_TOKEN` (401) |
| POST | `/api/auth/logout` | auth | `AuthController` | `AuthService` | Publico | - |
| GET | `/api/auth/me` | auth | `AuthController` | `AuthService` | JWT (cualquier rol) | `UNAUTHORIZED` (401) |

### 3.2 Tienda (publico)

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/store/products` | catalog | `ProductStoreController` | `ProductService` | Publico | - |
| GET | `/api/store/products/{id}` | catalog | `ProductStoreController` | `ProductService` | Publico | `PRODUCT_NOT_FOUND` (404) |
| GET | `/api/store/products/featured` | catalog | `ProductStoreController` | `ProductService` | Publico | - |
| GET | `/api/store/products/{id}/related` | catalog | `ProductStoreController` | `ProductService` | Publico | `PRODUCT_NOT_FOUND` (404) |
| GET | `/api/store/categories` | catalog | `CategoryStoreController` | `CategoryService` | Publico | - |
| GET | `/api/store/branches` | shared/branch | `StoreBranchController` | `BranchService` | Publico | - |
| GET | `/api/store/terms` | content | `LegalContentStoreController` | `LegalContentService` | Publico | - |
| GET | `/api/store/faq` | content | `LegalContentStoreController` | `LegalContentService` | Publico | - |

### 3.3 Cliente (autenticado)

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| POST | `/api/customer/orders` | orders | `CustomerOrderController` | `CustomerOrderService` | JWT (CUSTOMER) | `INSUFFICIENT_STOCK` (409), `PRODUCT_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |
| GET | `/api/customer/orders` | orders | `CustomerOrderController` | `CustomerOrderService` | JWT (CUSTOMER) | - |
| GET | `/api/customer/orders/{id}` | orders | `CustomerOrderController` | `CustomerOrderService` | JWT (CUSTOMER) | `ORDER_NOT_FOUND` (404) |
| POST | `/api/customer/orders/{orderId}/payments/preference` | payments | `CustomerPaymentController` | `PreferenceService` | JWT (CUSTOMER) | `ORDER_NOT_FOUND` (404), `ORDER_NOT_PAYABLE` (409), `MP_INVALID_AMOUNT` (400), `MP_PREFERENCE_REJECTED` (502), `MP_UPSTREAM_ERROR` (502), `MP_UNREACHABLE` (502) |
| GET | `/api/customer/payments` | payments | `CustomerPaymentController` | `PaymentService` | JWT (CUSTOMER) | - |

### 3.4 POS (empleado, gerente, administrador)

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/pos/products/search` | pos | `PosProductController` | `PosProductSearchService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `POS_QUERY_REQUIRED` (400), `POS_QUERY_TOO_LONG` (400) |
| POST | `/api/pos/sales` | pos | `PosSaleController` | `PosSaleService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_ALREADY_OPEN` (409), `INSUFFICIENT_STOCK` (409), `PRODUCT_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |

### 3.5 Admin - Caja

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| POST | `/api/admin/cash-sessions/open` | cash | `CashSessionController` | `CashService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_ALREADY_OPEN` (409), `CASH_BRANCH_REQUIRED` (400), `VALIDATION_ERROR` (400) |
| GET | `/api/admin/cash-sessions/current` | cash | `CashSessionController` | `CashService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_NOT_FOUND` (404) |
| GET | `/api/admin/cash-sessions/{id}` | cash | `CashSessionController` | `CashService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_NOT_FOUND` (404) |
| POST | `/api/admin/cash-sessions/{id}/movements` | cash | `CashSessionController` | `CashService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_NOT_FOUND` (404), `CASH_MOVEMENT_CLOSED_SESSION` (400), `VALIDATION_ERROR` (400) |
| POST | `/api/admin/cash-sessions/{id}/close` | cash | `CashSessionController` | `CashService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `CASH_SESSION_NOT_FOUND` (404), `CASH_SESSION_ALREADY_CLOSED` (409), `CASH_DIFFERENCE_REASON_REQUIRED` (400), `VALIDATION_ERROR` (400) |

### 3.6 Admin - Catalog

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/categories` | catalog | `CategoryAdminController` | `CategoryService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/categories` | catalog | `CategoryAdminController` | `CategoryService` | JWT (ADMIN, MANAGER) | `CATEGORY_NAME_DUPLICATED` (409), `PARENT_NOT_FOUND` (404), `PARENT_INVALID` (409), `CATEGORY_HIERARCHY_CYCLE` (409) |
| PUT | `/api/admin/categories/{id}` | catalog | `CategoryAdminController` | `CategoryService` | JWT (ADMIN, MANAGER) | `CATEGORY_NOT_FOUND` (404), `CATEGORY_NAME_DUPLICATED` (409), `PARENT_NOT_FOUND` (404), `CATEGORY_HIERARCHY_CYCLE` (409) |
| DELETE | `/api/admin/categories/{id}` | catalog | `CategoryAdminController` | `CategoryService` | JWT (ADMIN, MANAGER) | `CATEGORY_NOT_FOUND` (404), `CATEGORY_HAS_CHILDREN` (409), `CATEGORY_HAS_PRODUCTS` (409) |
| GET | `/api/admin/products` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/products` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_BARCODE_DUPLICATED` (409), `CATEGORY_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |
| GET | `/api/admin/products/{id}` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_NOT_FOUND` (404) |
| PUT | `/api/admin/products/{id}` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_NOT_FOUND` (404), `PRODUCT_BARCODE_DUPLICATED` (409), `VALIDATION_ERROR` (400) |
| DELETE | `/api/admin/products/{id}` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_NOT_FOUND` (404) |
| GET | `/api/admin/products/{id}/sale-price-history` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_NOT_FOUND` (404) |
| PATCH | `/api/admin/products/{id}/status` | catalog | `ProductAdminController` | `ProductService` | JWT (ADMIN, MANAGER) | `PRODUCT_NOT_FOUND` (404), `PRODUCT_STATUS_INVALID_TRANSITION` (409) |

### 3.7 Admin - Stock

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/stock/products` | inventory | `StockLotAdminController` | `StockQueryService` | JWT (ADMIN, MANAGER, EMPLOYEE) | - |
| GET | `/api/admin/stock/lots` | inventory | `StockLotAdminController` | `StockQueryService` | JWT (ADMIN, MANAGER, EMPLOYEE) | - |
| POST | `/api/admin/stock/lots` | inventory | `StockLotAdminController` | `StockQueryService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `PRODUCT_NOT_FOUND` (404), `BRANCH_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |
| POST | `/api/admin/stock/deductions` | inventory | `StockLotAdminController` | `InventoryStockCommandService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `INSUFFICIENT_STOCK` (409), `PRODUCT_NOT_FOUND` (404), `BRANCH_NOT_FOUND` (404), `INVALID_DEDUCTION_QUANTITY` (400) |
| POST | `/api/admin/stock/adjustments` | inventory | `StockLotAdminController` | `InventoryStockCommandService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `STOCK_LOT_NOT_FOUND` (404), `STOCK_LOT_NOT_ACTIVE` (409), `ADJUSTMENT_REASON_REQUIRED` (400), `ADJUSTMENT_QUANTITY_ZERO` (400), `INVALID_ADJUSTMENT_TYPE` (400), `INVALID_ADJUSTMENT_SIGN` (400) |
| GET | `/api/admin/stock/movements` | inventory | `StockLotAdminController` | `StockQueryService` | JWT (ADMIN, MANAGER, EMPLOYEE) | - |
| POST | `/api/admin/stock/receipts` | inventory | `StockReceiptAdminController` | `PurchaseReceiptEntryService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `PURCHASE_ORDER_NOT_FOUND` (404), `PURCHASE_RECEIPT_OVER_RECEIVED` (409), `PURCHASE_RECEIPT_ITEM_DUPLICATED` (400), `PURCHASE_RECEIPT_INVALID_STATE` (409), `PURCHASE_ORDER_INVALID_STATE` (409), `VALIDATION_ERROR` (400) |

### 3.8 Admin - Pedidos

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/orders` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | - |
| GET | `/api/admin/orders/{id}` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `ORDER_NOT_FOUND` (404) |
| PATCH | `/api/admin/orders/{id}/prepare` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `ORDER_NOT_FOUND` (404), `ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/orders/{id}/ready` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `ORDER_NOT_FOUND` (404), `ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/orders/{id}/delivered` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `ORDER_NOT_FOUND` (404), `ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/orders/{id}/cancel` | orders | `AdminOrderController` | `AdminOrderService` | JWT (ADMIN, MANAGER, EMPLOYEE) | `ORDER_NOT_FOUND` (404), `ORDER_INVALID_STATE` (409), `CANCEL_REASON_REQUIRED` (400), `ORDER_REFUNDED_CONFLICT` (409) |

### 3.9 Admin - Reportes

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/reports/dashboard` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/cash-overview` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/cash-sessions` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/cash-session/{id}` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | `CASH_SESSION_NOT_FOUND` (404) |
| GET | `/api/admin/reports/sales` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/employees` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/inventory` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |
| GET | `/api/admin/reports/suppliers` | reports | `ReportAdminController` | `ReportService` | JWT (ADMIN, MANAGER) | - |

### 3.10 Admin - Recomendaciones

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/recommendations` | reports | `RecommendationAdminController` | `RecommendationService` | JWT (ADMIN, MANAGER) | - |

### 3.11 Admin - Proveedores

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/suppliers` | suppliers | `SupplierAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/suppliers` | suppliers | `SupplierAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_CUIT_DUPLICATED` (409), `VALIDATION_ERROR` (400) |
| GET | `/api/admin/suppliers/{id}` | suppliers | `SupplierAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_NOT_FOUND` (404) |
| PUT | `/api/admin/suppliers/{id}` | suppliers | `SupplierAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_NOT_FOUND` (404), `SUPPLIER_CUIT_DUPLICATED` (409) |
| DELETE | `/api/admin/suppliers/{id}` | suppliers | `SupplierAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_NOT_FOUND` (404) |
| GET | `/api/admin/supplier-products` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/supplier-products` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_PRODUCT_DUPLICATED` (409), `PRODUCT_NOT_FOUND` (404), `SUPPLIER_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |
| GET | `/api/admin/supplier-products/{id}` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_PRODUCT_NOT_FOUND` (404) |
| PUT | `/api/admin/supplier-products/{id}` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_PRODUCT_NOT_FOUND` (404), `SUPPLIER_PRODUCT_DUPLICATED` (409) |
| DELETE | `/api/admin/supplier-products/{id}` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_PRODUCT_NOT_FOUND` (404) |
| GET | `/api/admin/supplier-products/{id}/cost-history` | suppliers | `SupplierProductAdminController` | `SupplierService` | JWT (ADMIN, MANAGER) | `SUPPLIER_PRODUCT_NOT_FOUND` (404) |

### 3.12 Admin - Ordenes de Compra

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/purchase-orders` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/purchase-orders` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_EMPTY` (400), `SUPPLIER_NOT_FOUND` (404), `PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID` (409), `VALIDATION_ERROR` (400) |
| GET | `/api/admin/purchase-orders/{id}` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404) |
| PUT | `/api/admin/purchase-orders/{id}` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404), `PURCHASE_ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/purchase-orders/{id}/confirm` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404), `PURCHASE_ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/purchase-orders/{id}/send` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404), `PURCHASE_ORDER_INVALID_STATE` (409) |
| PATCH | `/api/admin/purchase-orders/{id}/cancel` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404), `PURCHASE_ORDER_INVALID_STATE` (409) |
| GET | `/api/admin/purchase-orders/{id}/pdf` | suppliers | `PurchaseOrderAdminController` | `PurchaseOrderPdfService` | JWT (ADMIN, MANAGER) | `PURCHASE_ORDER_NOT_FOUND` (404) |

### 3.13 Admin - Actualizacion de Precios

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/price-update-batches` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | - |
| POST | `/api/admin/price-update-batches/manual` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `VALIDATION_ERROR` (400) |
| POST | `/api/admin/price-update-batches/import` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateImportService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_FILE_EMPTY` (400), `PRICE_BATCH_FILE_UNSUPPORTED` (400), `PRICE_BATCH_FILE_TOO_LARGE` (400), `PRICE_BATCH_REQUIRED_COLUMNS_MISSING` (400) |
| GET | `/api/admin/price-update-batches/{id}` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404) |
| PATCH | `/api/admin/price-update-batches/{id}` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409) |
| PATCH | `/api/admin/price-update-batches/defaults` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409) |
| PATCH | `/api/admin/price-update-batches/items/{itemId}` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_ITEM_NOT_FOUND` (404), `PRICE_BATCH_ITEM_INVALID` (400) |
| PATCH | `/api/admin/price-update-batches/apply-defaults-to-all` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409), `PRICE_BATCH_HAS_UNRESOLVED_ITEMS` (409) |
| POST | `/api/admin/price-update-batches/validate` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409) |
| POST | `/api/admin/price-update-batches/apply` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateCalculationService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409), `PRICE_BATCH_HAS_UNRESOLVED_ITEMS` (409) |
| POST | `/api/admin/price-update-batches/cancel` | suppliers | `PriceUpdateBatchAdminController` | `PriceUpdateBatchService` | JWT (ADMIN, MANAGER) | `PRICE_BATCH_NOT_FOUND` (404), `PRICE_BATCH_INVALID_STATE` (409) |

### 3.14 Admin - Usuarios

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/users` | users | `UserAdminController` | `UserAdminService` | JWT (ADMIN) | `INVALID_ROLE_FILTER` (400) |
| POST | `/api/admin/users` | users | `UserAdminController` | `UserAdminService` | JWT (ADMIN) | `EMAIL_DUPLICATED` (409), `INVALID_USER_BRANCH` (400), `BRANCH_INACTIVE` (422), `VALIDATION_ERROR` (400) |
| PUT | `/api/admin/users/{id}` | users | `UserAdminController` | `UserAdminService` | JWT (ADMIN) | `USER_NOT_FOUND` (404), `EMAIL_DUPLICATED` (409), `INVALID_USER_BRANCH` (400), `SELF_ROLE_CHANGE_FORBIDDEN` (403) |
| PATCH | `/api/admin/users/{id}` | users | `UserAdminController` | `UserAdminService` | JWT (ADMIN) | `USER_NOT_FOUND` (404), `EMAIL_DUPLICATED` (409), `INVALID_USER_BRANCH` (400), `SELF_ROLE_CHANGE_FORBIDDEN` (403) |
| PATCH | `/api/admin/users/{id}/status` | users | `UserAdminController` | `UserAdminService` | JWT (ADMIN) | `USER_NOT_FOUND` (404), `LAST_ADMIN_DISABLE_FORBIDDEN` (400), `BRANCH_INACTIVE` (422) |

### 3.15 Admin - Sucursales

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/api/admin/branches` | shared/branch | `BranchAdminController` | `BranchService` | JWT (ADMIN) | - |

### 3.16 Webhook

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| POST | `/api/webhooks/mercadopago` | payments | `MercadoPagoWebhookController` | `MercadoPagoWebhookProcessor` | Publico (firma) | `WEBHOOK_SIGNATURE_INVALID` (401), `MP_INVALID_RESPONSE` (502), `PAYMENT_NOT_FOUND` (404), `ORDER_NOT_FOUND` (404), `INSUFFICIENT_STOCK` (409), `ORDER_INVALID_STATE` (409) |

### 3.17 Infraestructura

| Metodo | Path | Modulo | Controlador | Servicio | Autenticacion | Codigos de Error |
|---|---|---|---|---|---|---|
| GET | `/actuator/health` | shared | - | - | Publico | - |
| GET | `/api-docs/**` | shared | - | - | Publico | - |
| GET | `/swagger-ui/**` | shared | - | - | Publico | - |

---

## 4. Matriz de Codigos de Error

La siguiente tabla cataloga la totalidad de los codigos de error definidos en el sistema, indicando el modulo que los origina, la clase que los lanza y el escenario que los dispara. Todos los codigos son instancias de `DomainException` y se serializan como `ApiError` en la respuesta HTTP.

| Codigo | HTTP | Modulo | Clase que lo lanza | Escenario |
|---|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | auth | `AuthService` | Email o contrasena incorrectos durante el inicio de sesion |
| `ACCOUNT_DISABLED` | 403 | auth | `AuthService` | Cuenta de usuario deshabilitada al intentar iniciar sesion |
| `INVALID_REFRESH_TOKEN` | 401 | auth | `AuthService` | Token de refresh invalido, expirado o no corresponde al usuario |
| `PRODUCT_NOT_FOUND` | 404 | catalog | `ProductService` | Producto no encontrado por ID o codigo de barras |
| `PRODUCT_BARCODE_DUPLICATED` | 409 | catalog | `ProductService` | Codigo de barras duplicado al crear o actualizar un producto |
| `PRODUCT_STATUS_INVALID_TRANSITION` | 409 | catalog | `ProductService` | Transicion de estado online no permitida (ej: de DRAFT a HIDDEN directamente) |
| `CATEGORY_NOT_FOUND` | 404 | catalog | `CategoryService` | Categoria no encontrada por ID |
| `PARENT_NOT_FOUND` | 404 | catalog | `CategoryService` | Categoria padre especificada no existe |
| `PARENT_INVALID` | 409 | catalog | `CategoryService` | La categoria padre no es valida para la operacion (ej: categoria inactiva) |
| `CATEGORY_NAME_DUPLICATED` | 409 | catalog | `CategoryService` | Nombre de categoria duplicado dentro del mismo nivel jerarquico |
| `CATEGORY_HAS_CHILDREN` | 409 | catalog | `CategoryService` | Intento de eliminar una categoria que posee subcategorias |
| `CATEGORY_HAS_PRODUCTS` | 409 | catalog | `CategoryService` | Intento de eliminar una categoria que posee productos asociados |
| `CATEGORY_HIERARCHY_CYCLE` | 409 | catalog | `CategoryService` | Asignacion de padre que crearia un ciclo en la jerarquia de categorias |
| `INSUFFICIENT_STOCK` | 409 | inventory | `InventoryStockCommandService`, `StockDeductionServicePosContract` | Stock insuficiente para cubrir la cantidad solicitada en una deduccion |
| `BRANCH_NOT_FOUND` | 404 | inventory | `StockQueryService`, `InventoryStockCommandService` | Sucursal no encontrada para operaciones de stock |
| `STOCK_LOT_NOT_FOUND` | 404 | inventory | `InventoryStockCommandService` | Lote de stock no encontrado por ID |
| `STOCK_LOT_MISMATCH` | 400 | inventory | `InventoryStockCommandService` | El lote no corresponde al producto o sucursal especificada |
| `STOCK_LOT_NOT_ACTIVE` | 409 | inventory | `InventoryStockCommandService` | Intento de operar sobre un lote que no esta activo (depleted o cancelled) |
| `ADJUSTMENT_REASON_REQUIRED` | 400 | inventory | `InventoryStockCommandService` | Ajuste de stock sin motivo obligatorio |
| `ADJUSTMENT_QUANTITY_ZERO` | 400 | inventory | `InventoryStockCommandService` | Ajuste de stock con cantidad cero |
| `INVALID_ADJUSTMENT_TYPE` | 400 | inventory | `InventoryStockCommandService` | Tipo de ajuste no reconocido |
| `INVALID_ADJUSTMENT_SIGN` | 400 | inventory | `InventoryStockCommandService` | Signo de cantidad inconsistente con el tipo de ajuste |
| `INVALID_DEDUCTION_QUANTITY` | 400 | inventory | `InventoryStockCommandService` | Cantidad de deduccion invalida (cero o negativa) |
| `ORDER_NOT_FOUND` | 404 | orders | `AdminOrderService`, `CustomerOrderService`, `OrderApplicationService` | Pedido no encontrado por ID |
| `ORDER_INVALID_STATE` | 409 | orders | `AdminOrderService`, `CustomerOrderService`, `OrderApplicationService` | Transicion de estado no permitida para el pedido (ej: cancelar un pedido ya entregado) |
| `CANCEL_REASON_REQUIRED` | 400 | orders | `AdminOrderService` | Cancelacion de pedido sin proporcionar el motivo obligatorio |
| `ORDER_REFUNDED_CONFLICT` | 409 | orders | `AdminOrderService` | Conflicto al cancelar un pedido que ya fue reembolsado |
| `CASH_SESSION_ALREADY_OPEN` | 409 | cash | `CashService` | Intento de abrir una sesion de caja cuando ya existe una abierta en la misma sucursal |
| `CASH_SESSION_NOT_FOUND` | 404 | cash | `CashService` | Sesion de caja no encontrada por ID |
| `CASH_BRANCH_REQUIRED` | 400 | cash | `CashService` | Operacion de caja sin especificar la sucursal |
| `CASH_MOVEMENT_CLOSED_SESSION` | 400 | cash | `CashService` | Intento de agregar un movimiento a una sesion de caja ya cerrada |
| `CASH_SESSION_ALREADY_CLOSED` | 409 | cash | `CashService` | Intento de cerrar una sesion de caja que ya fue cerrada |
| `CASH_DIFFERENCE_REASON_REQUIRED` | 400 | cash | `CashService` | Cierre de caja con diferencia sin proporcionar el motivo obligatorio |
| `POS_QUERY_REQUIRED` | 400 | pos | `PosProductSearchService` | Busqueda de producto POS sin termino de busqueda |
| `POS_QUERY_TOO_LONG` | 400 | pos | `PosProductSearchService` | Termino de busqueda POS que excede la longitud maxima permitida |
| `MP_INVALID_AMOUNT` | 400 | payments | `PreferenceService` | Monto invalido para crear una preferencia de pago en Mercado Pago |
| `MP_INVALID_RESPONSE` | 502 | payments | `MercadoPagoGateway`, `MercadoPagoWebhookProcessor` | Respuesta inesperada o malformada de la API de Mercado Pago |
| `MP_PREFERENCE_REJECTED` | 502 | payments | `PreferenceService` | Mercado Pago rechazo la creacion de la preferencia de pago |
| `MP_UNAUTHORIZED` | 502 | payments | `MercadoPagoGateway` | Error de autenticacion con la API de Mercado Pago (Access Token invalido) |
| `MP_NOT_FOUND` | 502 | payments | `MercadoPagoGateway` | Recurso no encontrado en la API de Mercado Pago |
| `MP_UPSTREAM_ERROR` | 502 | payments | `MercadoPagoGateway` | Error interno del servidor de Mercado Pago |
| `MP_UNREACHABLE` | 502 | payments | `MercadoPagoGateway` | No se puede establecer conexion con la API de Mercado Pago |
| `ORDER_NOT_PAYABLE` | 409 | payments | `PreferenceService` | El pedido no esta en un estado que permita generar un pago (no es PENDING_PAYMENT) |
| `PAYMENT_NOT_FOUND` | 404 | payments | `PaymentService`, `MercadoPagoWebhookProcessor` | Pago no encontrado por ID |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | payments | `MercadoPagoWebhookController`, `WebhookSignatureValidator` | Firma del webhook de Mercado Pago invalida o ausente |
| `SUPPLIER_NOT_FOUND` | 404 | suppliers | `SupplierService`, `PurchaseOrderService` | Proveedor no encontrado por ID |
| `SUPPLIER_CUIT_DUPLICATED` | 409 | suppliers | `SupplierService` | CUIT de proveedor duplicado al crear o actualizar |
| `SUPPLIER_PRODUCT_NOT_FOUND` | 404 | suppliers | `SupplierService` | Producto de proveedor no encontrado por ID |
| `SUPPLIER_PRODUCT_DUPLICATED` | 409 | suppliers | `SupplierService` | Asociacion producto-proveedor duplicada |
| `PURCHASE_ORDER_NOT_FOUND` | 404 | suppliers | `PurchaseOrderService`, `PurchaseReceiptService` | Orden de compra no encontrada por ID |
| `PURCHASE_ORDER_INVALID_STATE` | 409 | suppliers | `PurchaseOrderService`, `PurchaseReceiptService` | Transicion de estado no permitida para la orden de compra |
| `PURCHASE_ORDER_EMPTY` | 400 | suppliers | `PurchaseOrderService` | Orden de compra creada sin items |
| `PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID` | 409 | suppliers | `PurchaseOrderService` | Producto no asociado al proveedor en la orden de compra |
| `PURCHASE_RECEIPT_INVALID_STATE` | 409 | suppliers | `PurchaseReceiptService` | Estado del recibo de compra no permite la operacion solicitada |
| `PURCHASE_RECEIPT_ITEM_DUPLICATED` | 400 | suppliers | `PurchaseReceiptService` | Item duplicado en el recibo de compra |
| `PURCHASE_RECEIPT_OVER_RECEIVED` | 409 | suppliers | `PurchaseReceiptEntryService` | Cantidad recibida excede la cantidad ordenada en la orden de compra |
| `PRICE_BATCH_NOT_FOUND` | 404 | suppliers | `PriceUpdateBatchService` | Lote de actualizacion de precios no encontrado por ID |
| `PRICE_BATCH_INVALID_STATE` | 409 | suppliers | `PriceUpdateBatchService` | Estado del lote no permite la operacion (ej: aplicar un lote ya aplicado) |
| `PRICE_BATCH_HAS_UNRESOLVED_ITEMS` | 409 | suppliers | `PriceUpdateBatchService` | Lote con items sin resolver antes de aplicar |
| `PRICE_BATCH_ITEM_INVALID` | 400 | suppliers | `PriceUpdateBatchService` | Item del lote con datos invalidos (ej: precio negativo) |
| `PRICE_BATCH_ITEM_NOT_FOUND` | 404 | suppliers | `PriceUpdateBatchService` | Item del lote no encontrado por ID |
| `PRICE_BATCH_FILE_EMPTY` | 400 | suppliers | `PriceUpdateImportService` | Archivo de actualizacion de precios vacio |
| `PRICE_BATCH_FILE_UNSUPPORTED` | 400 | suppliers | `PriceUpdateImportService` | Formato de archivo no soportado (no es CSV ni XLSX) |
| `PRICE_BATCH_FILE_TOO_LARGE` | 400 | suppliers | `PriceUpdateImportService` | Archivo de precios que excede el tamanio maximo permitido |
| `PRICE_BATCH_REQUIRED_COLUMNS_MISSING` | 400 | suppliers | `PriceUpdateImportService` | Columnas obligatorias faltantes en el archivo importado |
| `USER_NOT_FOUND` | 404 | users | `UserAdminService`, `UserDirectoryService` | Usuario no encontrado por ID |
| `INVALID_USER_BRANCH` | 400 | users | `UserAdminService`, `UserBranchPolicy` | Sucursal invalida o inconsistente con el rol del usuario |
| `INVALID_ROLE_FILTER` | 400 | users | `UserAdminService` | Filtro de rol invalido en la busqueda de usuarios |
| `BRANCH_INACTIVE` | 422 | users | `UserAdminService` | Intento de asignar un usuario a una sucursal inactiva |
| `SELF_ROLE_CHANGE_FORBIDDEN` | 403 | users | `UserAdminService` | Un administrador no puede cambiarse su propio rol |
| `LAST_ADMIN_DISABLE_FORBIDDEN` | 400 | users | `UserAdminService` | Intento de deshabilitar el unico administrador restante del sistema |
| `EMAIL_DUPLICATED` | 409 | users, auth | `UserAdminService`, `AuthService` | Email duplicado al crear o actualizar un usuario |
| `VALIDATION_ERROR` | 400 | shared | `GlobalExceptionHandler` | Error de validacion de datos de entrada (Bean Validation, @Valid) |
| `DATA_INTEGRITY_VIOLATION` | 409 | shared | `GlobalExceptionHandler` | Violacion de integridad de datos no capturada especificamente (constraint de BD) |
| `ACCESS_DENIED` | 403 | shared | `GlobalExceptionHandler` | Acceso denegado por falta de permisos (Spring Security) |
| `UNAUTHORIZED` | 401 | shared | `GlobalExceptionHandler` | Autenticacion requerida pero no provista o token invalido/expirado |
| `INTERNAL_ERROR` | 500 | shared | `GlobalExceptionHandler` | Error interno del servidor no esperado |
| `INVALID_ORIGIN` | 403 | shared | `OriginValidationFilter` | Origen HTTP no autorizado para metodos inseguros |

---

## 5. Matriz de Flujos Criticos a Probar

La siguiente tabla identifica los flujos de negocio fundamentales del sistema, indicando la ubicacion de las pruebas correspondientes en el repositorio, los escenarios cubiertos (normal, error, autenticacion, concurrencia) y una referencia a la documentacion de dominio asociada.

| ID | Flujo Critico | Ubicacion de Pruebas (backend) | Ubicacion de Pruebas (frontend) | Escenarios Normal | Escenarios Error | Escenarios Autenticacion | Escenarios Concurrencia |
|---|---|---|---|---|---|---|---|
| FC-01 | **Registro e inicio de sesion** | `auth/integration/AuthRegistrationIntegrationTest.java`, `auth/integration/AuthLoginIntegrationTest.java`, `auth/service/AuthServiceTest.java`, `auth/web/AuthControllerTest.java` | `features/auth/login/login.spec.ts`, `features/auth/register/register.spec.ts` | Registro exitoso, login exitoso, refresh de token, logout | Email duplicado (409), credenciales invalidas (401), cuenta deshabilitada (403), token invalido (401) | - | - |
| FC-02 | **Navegacion del catalogo publico** | `catalog/web/ProductStoreControllerTest.java`, `catalog/web/CategoryStoreControllerTest.java` | `features/public-store/catalog/catalog.spec.ts`, `features/public-store/product-detail/product-detail.spec.ts` | Listado paginado, detalle de producto, productos destacados, productos relacionados, arbol de categorias | Producto no encontrado (404) | Acceso publico sin autenticacion | - |
| FC-03 | **Gestion de productos (ABMC)** | `catalog/web/ProductAdminControllerTest.java`, `catalog/service/ProductServiceTest.java`, `catalog/repository/ProductRepositoryTest.java` | `features/admin/products/product-form.spec.ts`, `features/admin/products/product-list.spec.ts` | Creacion, lectura, actualizacion, eliminacion, cambio de estado online | Barcode duplicado (409), producto no encontrado (404), transicion de estado invalida (409) | 403 para EMPLOYEE, exito para ADMIN/MANAGER | - |
| FC-04 | **Ingreso de stock por recepcion de compra** | `inventory/application/PurchaseReceiptEntryServiceTest.java`, `inventory/web/StockReceiptAdminControllerTest.java`, `suppliers/service/PurchaseReceiptServiceTest.java`, `suppliers/service/PurchaseReceiptConcurrencyIntegrationTest.java` | `features/admin/stock-entry/stock-entry.spec.ts` | Recepcion completa, recepcion parcial con creacion de lotes | Orden no encontrada (404), sobre-recepcion (409), item duplicado (400), estado invalido (409) | 403 para acceso sin rol | Dos recepciones concurrentes sobre la misma orden de compra |
| FC-05 | **Deduccion FEFO de stock** | `inventory/service/FefoStockDeductionPolicyTest.java`, `inventory/application/InventoryStockCommandServiceTest.java`, `inventory/repository/StockLotRepositoryTest.java` | - (logica interna del backend) | Lote unico, multiples lotes, lotes con NULL expiration, orden FIFO por vencimiento | Stock insuficiente (409), lote no activo (409), cantidad invalida (400) | - | - |
| FC-06 | **Venta en mostrador (POS)** | `pos/PosSaleIntegrationTest.java`, `pos/service/PosSaleServiceTest.java`, `pos/web/PosSaleControllerTest.java` | `features/admin/pos/pos.spec.ts`, `features/admin/pos/state/pos-cart.store.spec.ts` | Venta exitosa con deduccion FEFO, busqueda de producto por codigo/barcode | Caja no abierta, stock insuficiente (409), producto no encontrado (404) | 403 para CUSTOMER, exito para EMPLOYEE/MANAGER/ADMIN | Dos ventas POS simultaneas sobre el mismo lote |
| FC-07 | **Compra online con Mercado Pago** | `orders/service/CustomerOrderServiceTest.java`, `orders/web/CustomerOrderControllerTest.java`, `payments/service/PreferenceServiceTest.java` | `features/checkout/data-access/customer-checkout.spec.ts`, `features/customer/checkout/checkout.spec.ts` | Creacion de pedido, creacion de preferencia MP, redireccion a MP, polling de estado | Stock insuficiente (409), producto no encontrado (404), pedido no pagable (409), MP preference rechazado (502) | 401 sin autenticacion, 403 para ADMIN | - |
| FC-08 | **Procesamiento de webhook MP (aprobacion)** | `payments/service/MercadoPagoWebhookProcessorTest.java`, `payments/PaymentWebhookTransactionIntegrationTest.java`, `payments/service/WebhookOrderEffectApplierTest.java` | - (callback externo) | Aprobacion con deduccion FEFO, cambio a PAID, registros de pago y movimiento | Firma invalida (401), respuesta MP invalida (502), pago no encontrado (404) | - | Dos webhooks simultaneos para el mismo pago |
| FC-09 | **Idempotencia de webhook MP** | `payments/PaymentWebhookTransactionIntegrationTest.java`, `payments/service/MercadoPagoWebhookProcessorTest.java` | - (callback externo) | Segundo llamado con mismo provider_payment_id retorna 200 sin efectos secundarios | - | - | - |
| FC-10 | **Webhook MP sin stock disponible** | `payments/service/WebhookOrderEffectApplierTest.java`, `payments/PaymentWebhookTransactionIntegrationTest.java` | - (callback externo) | Pedido pasa a STOCK_CONFLICT, no se deduce stock | - | - | - |
| FC-11 | **Apertura de caja** | `cash/service/CashServiceTest.java`, `cash/web/CashSessionControllerTest.java` | `features/admin/cash/open/cash-open.spec.ts` | Apertura exitosa con monto inicial | Sesion ya abierta (409), sucursal no especificada (400) | 403 para CUSTOMER | Dos aperturas simultaneas en la misma sucursal |
| FC-12 | **Cierre de caja con arqueo** | `cash/service/CashServiceCloseTest.java`, `cash/service/CashCloseCalculatorTest.java` | `features/admin/cash/close/cash-close.spec.ts` | Cierre sin diferencia, cierre con diferencia y motivo | Sesion ya cerrada (409), diferencia sin motivo (400), sesion no encontrada (404) | 403 para CUSTOMER | Dos cierres simultaneos sobre la misma sesion |
| FC-13 | **Preparacion y entrega de pedido online** | `orders/service/AdminOrderServiceTest.java`, `orders/web/AdminOrderControllerTest.java` | `features/admin/orders/orders.spec.ts`, `features/admin/orders/order-detail-page/order-detail-page.spec.ts` | Transicion PAID -> PREPARING -> READY -> DELIVERED | Estado invalido en cada transicion (409), pedido no encontrado (404) | 403 para CUSTOMER | - |
| FC-14 | **Cancelacion de pedido con contraccion de stock** | `orders/service/AdminOrderCancellationConcurrencyIntegrationTest.java`, `orders/service/AdminOrderServiceTest.java` | `features/admin/orders/order-detail-page/order-detail-page.spec.ts` | Cancelacion de pedido PAID: reversión exacta de lotes, payment a CANCELLED | Cancelacion sin motivo (400), estado invalido (409), pedido ya reembolsado (409) | 403 para CUSTOMER | Dos cancelaciones simultaneas sobre el mismo pedido |
| FC-15 | **Gestion de proveedores (ABMC)** | `suppliers/web/SupplierAdminControllerTest.java`, `suppliers/service/SupplierServiceTest.java` | `features/admin/suppliers/suppliers.spec.ts` | Creacion, lectura, actualizacion, eliminacion | CUIT duplicado (409), proveedor no encontrado (404) | 403 para EMPLOYEE, exito para ADMIN/MANAGER | - |
| FC-16 | **Gestion de ordenes de compra** | `suppliers/web/PurchaseOrderAdminControllerTest.java`, `suppliers/service/PurchaseOrderServiceTest.java` | `features/admin/purchase-orders/purchase-orders.spec.ts` | Creacion, confirmacion, envio, cancelacion, generacion de PDF | Orden vacia (400), estado invalido (409), producto no asociado al proveedor (409) | 403 para EMPLOYEE | - |
| FC-17 | **Actualizacion masiva de precios** | `suppliers/service/PriceUpdateBatchServiceTest.java`, `suppliers/service/PriceUpdateCalculationServiceTest.java`, `suppliers/service/PriceUpdateImportServiceTest.java`, `suppliers/web/PriceUpdateBatchAdminControllerTest.java` | `features/admin/pricing/price-update-workflow.spec.ts` | Importacion de archivo, calculo de precios sugeridos, validacion, aplicacion masiva | Archivo invalido (400), lote en estado incorrecto (409), items sin resolver (409) | 403 para EMPLOYEE | - |
| FC-18 | **Visualizacion de reportes** | `reports/web/ReportAdminControllerTest.java`, `reports/service/ReportServiceTest.java`, `reports/repository/ReportQueryRepositoryTest.java` | `features/admin/reports/reports.spec.ts`, `features/admin/dashboard/dashboard.spec.ts` | Dashboard, resumen de caja, sesiones de caja, ventas, empleados, inventario, proveedores | Sesion de caja no encontrada (404) | 403 para EMPLOYEE, exito para ADMIN/MANAGER | - |
| FC-19 | **Recomendaciones basadas en reglas** | `reports/service/RecommendationServiceTest.java`, `reports/web/RecommendationAdminControllerTest.java` | `features/admin/reports/recommendations/recommendations-panel.spec.ts` | Stock bajo, productos proximos a vencer, baja rotacion, productos sin movimiento | - | 403 para EMPLOYEE, exito para ADMIN/MANAGER | - |
| FC-20 | **Gestion de usuarios internos** | `users/web/UserAdminControllerTest.java`, `users/service/UserAdminServiceTest.java`, `users/service/UserBranchPolicyTest.java` | `features/admin/users/users.spec.ts`, `features/admin/users/user-form.spec.ts`, `features/admin/users/user-list.spec.ts` | Creacion, edicion, cambio de estado (habilitar/deshabilitar) | Email duplicado (409), usuario no encontrado (404), sucursal inactiva (422), auto-cambio de rol (403), ultimo admin deshabilitado (400) | 403 para MANAGER/EMPLOYEE, solo ADMIN | - |

---

## Referencias

Las matrices presentadas en este documento se construyeron a partir del analisis directo del codigo fuente del repositorio `Dietetica Lembas`, incluyendo:

- **Modulos backend**: estructura de paquetes bajo `backend/src/main/java/com/dietetica/lembas/` con 13 modulos funcionales (auth, users, catalog, content, inventory, orders, payments, cash, pos, suppliers, reports, audit, shared).
- **Controladores REST**: 24 clases de controlador identificadas en los paquetes `web/` de cada modulo.
- **Pruebas automatizadas**: 920 pruebas backend (JUnit 5 + Testcontainers) y 986 pruebas frontend (Vitest 4 + jsdom 28), con cobertura de 75.57% sentencias, 74.67% ramas, 55.61% funciones y 78.42% lineas.
- **Contratos entre modulos**: interfaces `api/` que definen los limites arquitectonicos (catalog/api, inventory/api, orders/api, payments/api, users/api, shared/branch/api).
- **Migraciones Flyway**: 31 migraciones versionadas desde V1 hasta V31 que definen el esquema completo de 18 tablas principales.
- **Documentacion de dominio**: reglas de negocio documentadas en `docs/02-domain/` y flujos de proceso en `docs/04-processes/`.
- **Metricas de cobertura**: verificadas por JaCoCo durante la ejecucion de `mvn clean verify`.
