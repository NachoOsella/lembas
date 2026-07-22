# Indice de Documentacion / Thesis Reading Order

> **Proyecto:** Sistema de Gestion Comercial Integrado con E-commerce para Dietetica Lembas
> **Autor:** Ignacio Osella - Legajo 412023
> **Tipo:** Proyecto Final de Grado (TPF/Tesis)
> **Idioma:** Espanol

## Estructura de la Documentacion

Este indice organiza la documentacion del repositorio en una secuencia de lectura que corresponde a la estructura de una tesis de ingenieria de software. Cada seccion mapea a los documentos relevantes en el directorio `docs/`.

---

## 1. Introduccion y Contexto

| Tema | Documento | Descripcion |
|---|---|---|
| Resumen ejecutivo | `docs/00-overview/project-brief.md` | Vision general del sistema, modulos y valor diferencial |
| Planteamiento del problema | `docs/00-overview/problem-statement.md` | Situacion actual, puntos de dolor, criterios de exito |
| Contexto de negocio | `docs/00-overview/business-context.md` | Caracteristicas del negocio, mercado, reglas clave |
| Alcance MVP | `docs/00-overview/scope.md` | Funcionalidades incluidas y excluidas explicitamente |
| Fuera de alcance | `docs/01-product/out-of-scope.md` | Decisiones conscientes de exclusion con referencias ADR |

## 2. Marco Teorico y Metodologico

| Tema | Documento | Descripcion |
|---|---|---|
| Metodologia de desarrollo | `docs/08-academic/methodology.md` | Scrum, sprints, proceso de ingeneria |
| Justificacion tecnica | `docs/08-academic/technical-justification.md` | Decisiones arquitectonicas, comparacion de alternativas |
| Glosario | `docs/00-overview/glossary.md` | Definiciones de terminos del dominio |

## 3. Requerimientos y Planificacion

| Tema | Documento | Descripcion |
|---|---|---|
| Epicas MVP | `docs/01-product/epics.md` | 13 epicas que agrupan las historias de usuario |
| Historias de usuario | `docs/01-product/user-stories.md` | 48 historias en 4 sprints, 300 puntos de historia |
| Roadmap | `docs/01-product/roadmap.md` | Planificacion de sprints con prioridades y riesgos |
| Criterios de evaluacion | `docs/08-academic/evaluation-criteria.md` | Criterios de exito del MVP por area |
| Matriz de requerimientos | `docs/08-academic/traceability-matrices.md` | Trazabilidad requisitos-modulos-endpoints-tests |
| Riesgos del proyecto | `docs/08-academic/project-risks.md` | Riesgos tecnicos, de proyecto y academicos |

## 4. Analisis de Dominio

| Tema | Documento | Descripcion |
|---|---|---|
| Modelo de dominio | `docs/02-domain/domain-model.md` | Diagrama ER conceptual, decisiones de dominio |
| Entidades | `docs/02-domain/entities.md` | Catalogo completo de tablas y entidades |
| Reglas de negocio | `docs/02-domain/business-rules.md` | Reglas por area: productos, stock, ordenes, pagos |
| Maquinas de estado | `docs/02-domain/state-machines.md` | Order, payment, cash session, product status |
| Reglas de stock | `docs/02-domain/stock-rules.md` | FEFO, lotes, movimientos, concurrencia |
| Reglas de ordenes | `docs/02-domain/order-rules.md` | Canales, estados, cancelacion |
| Reglas de pagos | `docs/02-domain/payment-rules.md` | Proveedores, metodos, integracion MP |
| Reglas de caja | `docs/02-domain/cash-register-rules.md` | Apertura, movimientos, cierre, arqueo |

## 5. Arquitectura del Sistema

| Tema | Documento | Descripcion |
|---|---|---|
| Vision general | `docs/03-architecture/architecture-overview.md` | Estilo arquitectonico, diagrama C4 contexto, pila tecnologica |
| Decisiones arquitectonicas (ADR) | `docs/03-architecture/architecture-decisions.md` | 49 ADRs con estado, contexto y consecuencias |
| Arquitectura backend | `docs/03-architecture/backend-architecture.md` | Modulos, contratos API, filtro de seguridad |
| Arquitectura frontend | `docs/03-architecture/frontend-architecture.md` | Estructura de funcionalidades, rutas, componentes |
| Arquitectura de seguridad | `docs/03-architecture/security-architecture.md` | Autenticacion JWT, RBAC, matriz de acceso |
| Diseno de base de datos | `docs/03-architecture/database-design.md` | Esquema relacional, tablas clave, migraciones Flyway |
| Integraciones externas | `docs/03-architecture/integrations.md` | Mercado Pago, almacenamiento de imagenes |

## 6. Procesos de Negocio (Diagramas de Secuencia)

| Tema | Documento | Descripcion |
|---|---|---|
| Deduccion FEFO | `docs/04-processes/fefo-stock-deduction-flow.md` | Online (webhook) y POS, cancelacion con reversal |
| Venta en sucursal (POS) | `docs/04-processes/in-store-sale-flow.md` | Apertura de caja, venta, cierre con arqueo |
| Compra online con retiro | `docs/04-processes/online-purchase-pickup-flow.md` | Registro, catalogo, checkout MP, preparacion, retiro |
| Integracion Mercado Pago | `docs/04-processes/mercado-pago-flow.md` | Preferencia, webhook, idempotencia |
| Cancelacion de orden | `docs/04-processes/order-cancellation-flow.md` | Reversion de stock por lotes exactos |
| Apertura y cierre de caja | `docs/04-processes/cash-opening-closing-flow.md` | Calculo de efectivo esperado, manejo de diferencias |
| Orden de compra | `docs/04-processes/purchase-order-flow.md` | Creacion, confirmacion, envio |
| Recepcion de mercaderia | `docs/04-processes/purchase-receipt-flow.md` | Creacion de lotes y movimientos |
| Publicacion de productos | `docs/04-processes/product-publication-flow.md` | Ciclo de vida del estado online |
| Historial de precios | `docs/04-processes/sale-price-history-flow.md` | Actualizacion transaccional con historial |
| Actualizacion de precios por lote | `docs/04-processes/supplier-price-update-flow.md` | Importacion, previsualizacion, aplicacion |

## 7. Diseno de API

| Tema | Documento | Descripcion |
|---|---|---|
| Convenciones API | `docs/05-api/api-guidelines.md` | Formato de respuesta, paginacion, codigos de error |
| Endpoints | `docs/05-api/endpoints.md` | Inventario completo de endpoints por espacio URL |
| Manejo de errores | `docs/05-api/error-handling.md` | ApiError, DomainException, catalogo de codigos |
| Convenciones DTO | `docs/05-api/dto-conventions.md` | Nombres, ubicacion, ejemplos |

## 8. Desarrollo y Pruebas

| Tema | Documento | Descripcion |
|---|---|---|
| Configuracion del entorno | `docs/06-development/setup.md` | Prerrequisitos, instalacion, comandos |
| Convenciones backend | `docs/06-development/backend-conventions.md` | Estructura de modulos, controladores, servicios |
| Convenciones frontend | `docs/06-development/frontend-conventions.md` | Componentes, estado, routing |
| Estandares de codigo | `docs/06-development/coding-standards.md` | Nomenclatura, estilo, estructura |
| Estrategia de pruebas | `docs/06-development/testing-strategy.md` | Piramide de tests, flujos criticos |
| Flujo de trabajo Git | `docs/06-development/git-workflow.md` | Ramas, commits convencionales, PR |

## 9. Despliegue y Operaciones

| Tema | Documento | Descripcion |
|---|---|---|
| Entorno local | `docs/07-deployment/local-environment.md` | Servicios, URLs, usuarios demo |
| Docker | `docs/07-deployment/docker.md` | Composes, Dockerfiles, arquitectura |
| Variables de entorno | `docs/07-deployment/environment-variables.md` | Referencia completa de configuracion |
| Despliegue en produccion | `docs/07-deployment/production-deployment.md` | Pasos, Nginx, backup, monitoreo |

## 10. Documentacion Academica

| Tema | Documento | Descripcion |
|---|---|---|
| Evaluacion | `docs/08-academic/evaluation-criteria.md` | Criterios de evaluacion por area |
| Justificacion tecnica | `docs/08-academic/technical-justification.md` | Analisis arquitectonico detallado |
| Riesgos | `docs/08-academic/project-risks.md` | Riesgos tecnicos, de proyecto y academicos |
| Defensa de tesis | `docs/08-academic/thesis-defense.md` | Argumento de defensa,competencia demostrada |
| Metodologia | `docs/08-academic/methodology.md` | Metodologia de desarrollo y calidad |
| Matrices de trazabilidad | `docs/08-academic/traceability-matrices.md` | Matrices requisitos-API-tests-errores |
| Apendice de evidencia | `docs/08-academic/evidence-appendix.md` | Comandos reproducibles, resultados de tests |
| Bibliografia | `docs/08-academic/bibliography.md` | Referencias academicas y tecnicas |

## 11. Registro de Uso de IA

| Tema | Documento | Descripcion |
|---|---|---|
| Registro de IA | `docs/ai-usage-log.md` | Historial de cambios asistidos por inteligencia artificial |

## 12. Plan de Ejecucion

| Tema | Documento | Descripcion |
|---|---|---|
| Plan de refactorizacion | `docs/refactoring-execution-plan.md` | Refactor completado, trabajo diferido |
| Plan de implementacion (reportes) | `docs/implementation-plan-reports-dashboard.md` | Plan detallado de reportes Sprint 4 |

---

## Secuencia de Lectura Recomendada para Evaluacion

Para una evaluacion academica, se recomienda la siguiente secuencia:

1. **Introduccion**: `project-brief.md`, `problem-statement.md`, `scope.md`
2. **Metodologia**: `methodology.md`
3. **Dominio**: `domain-model.md`, `business-rules.md`, `state-machines.md`
4. **Arquitectura**: `architecture-overview.md`, `architecture-decisions.md`
5. **Backend**: `backend-architecture.md`, `database-design.md`
6. **Frontend**: `frontend-architecture.md`
7. **Seguridad**: `security-architecture.md`
8. **Procesos**: Diagramas de secuencia en `docs/04-processes/`
9. **API**: `endpoints.md`, `error-handling.md`
10. **Pruebas**: `testing-strategy.md`
11. **Despliegue**: `docker.md`, `production-deployment.md`
12. **Justificacion**: `technical-justification.md`
13. **Evaluacion**: `evaluation-criteria.md`, `project-risks.md`
14. **Apéndices**: `traceability-matrices.md`, `evidence-appendix.md`, `bibliography.md`
15. **Defensa**: `thesis-defense.md`
