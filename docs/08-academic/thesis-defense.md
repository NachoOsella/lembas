# Defensa de Tesis

## Resumen del Proyecto

**Titulo:** Sistema de Gestion Comercial Integrado con E-commerce para Dietetica Lembas

**Tipo:** Proyecto Final de Grado (TPF/Tesis)

**Autor:** Ignacio Osella - Legajo 412023

**Duracion:** 4 sprints de 2 semanas cada uno (8 semanas totales)

**Pila tecnologica:** Java 21, Spring Boot 3.5, Angular 21.2 (standalone, Signals), PrimeNG 21.1, PostgreSQL 16, Docker, Mercado Pago

## Tesis

> Como construir una plataforma comercial unificada que sirva tanto a ventas en sucursal como a ventas online desde un unico nucleo compartido, evitando el error comun de construir dos sistemas desconectados.

## Argumento de Defensa

### El problema

Los pequenos comercios minoristas en Argentina enfrentan un panorama tecnologico fragmentado:

- Sistemas POS que no se comunican con plataformas de e-commerce
- Stock registrado en papel o planillas de calculo
- Sin vision unificada de ventas, efectivo o inventario
- Productos perecederos que requieren gestion FEFO (First Expired, First Out)
- Actualizacion manual de precios en multiples canales
- Sin metricas comerciales accionables para la toma de decisiones
- Conciliacion de caja manual y propensa a errores

### La solucion: tres areas integradas

El sistema se estructura en tres areas interconectadas que comparten un unico nucleo comercial:

1. **Backoffice / ERP** -- Gestion de productos, stock, proveedores, ventas en sucursal, caja, ordenes y reportes
2. **Modulo de e-commerce** -- Catalogo publico, carrito local, checkout Mercado Pago, retiro en sucursal
3. **Asistente inteligente** -- Recomendaciones basadas en reglas de negocio (stock bajo, proximos a vencer, rotacion, sin movimiento)

Las tres areas comparten un unico nucleo comercial. No hay silos de datos ni duplicacion.

### Por que no son dos sistemas separados

La idea central: construir un ERP y un e-commerce por separado e integrarlos posteriormente es un patron de fracaso frecuente (Fowler, 2002; Vernon, 2013). Este sistema construye un unico nucleo comercial que alimenta ambos canales. Productos, stock, ordenes, pagos y clientes son entidades compartidas. El canal (sucursal vs online) es solo un campo `type` en la orden.

El sistema va mas alla del CRUD simple porque implementa procesos de negocio completos:

- **Compra online** con validacion de stock en tiempo real y pago por Mercado Pago
- **Maquina de estados de ordenes** con trazabilidad completa (9 estados para ONLINE, 2 para POS)
- **Ciclo de vida de pagos** con actualizaciones via webhook y maquina de estados de 7 estados
- **Venta en sucursal** con deduccion FEFO automatica y caja registradora integrada
- **Cierre de caja** con deteccion de diferencias, motivo obligatorio y pista de auditoria
- **Recomendaciones** basadas en reglas de negocio usando datos reales de catalogo y stock
- **Actualizacion de precios** con importacion de listas de proveedores, previsualizacion y aplicacion controlada
- **Conciliacion de stock** con trazabilidad por lote, movimiento y orden

### Decisiones tecnicas clave

1. **Monolito modular** sobre microservicios (desarrollador unico, complejidad controlada, contratos API explicitos validados con ArchUnit)
2. **Modelo de orden unificado** (POS y ONLINE comparten la misma tabla)
3. **Lotes de stock como unica fuente de verdad** (sin tablas desnormalizadas, FEFO incorporado en la consulta)
4. **Stock deducido al confirmar el pago** (sin tabla de reservas separada, reversal via movimientos de cancelacion)
5. **Integracion Mercado Pago localizada** (procesamiento de pagos y webhook en el modulo payments, sin abstracciones prematuras)
6. **Caja registradora controla solo efectivo fisico** (otros metodos son informativos al cierre)
7. **Recomendaciones basadas en reglas** (deterministicas, predecibles, sin alucinaciones de IA)
8. **Contratos API entre modulos** (cada modulo expone un paquete `api/`; ArchUnit y el verificador de fronteras del frontend rechazan violaciones)

## Que demuestra el MVP

| Competencia | Evidencia |
|---|---|
| Desarrollo full-stack | Angular 21.2 (Signals, standalone) + Spring Boot 3.5 desde cero |
| Diseno de base de datos | 24 tablas, integridad relacional, CHECK constraints, migraciones Flyway versionadas |
| Integracion de API externa | Mercado Pago Checkout Pro con preferencias, webhook con verificacion HMAC-SHA256 e idempotencia |
| Manejo de transacciones | Deduccion FEFO con bloqueo pesimista (SELECT FOR UPDATE), concurrencia con latches |
| Estrategia de pruebas | Unitarias (servicios), integracion (Testcontainers), controlador (@WebMvcTest), arquitectura (ArchUnit) |
| Gestion de proyecto | Scrum con 4 sprints, 48 historias de usuario, 300 puntos de historia |
| Arquitectura de software | Monolito modular con 13 modulos, contratos API, DTOs inmutables, capas separadas |
| Seguridad | JWT con HttpOnly cookies, BCrypt, RBAC con 4 roles, guards de rutas, auditoria |
| Modelado de procesos de negocio | Diagramas de secuencia para 11 flujos criticos, diagramas de estado para 4 maquinas |

## Metricas del Proyecto

| Metrica | Valor |
|---|---|
| Modulos backend | 13 modulos por funcionalidad |
| Tablas en base de datos | 24 entidades + 1 secuencia |
| Migraciones Flyway | 31 versionadas |
| Endpoints REST | 50+ endpoints |
| Tests backend | 920 (unitarios, integracion, controlador, arquitectura) |
| Tests frontend | 986 (componentes, servicios, guards) |
| Cobertura backend | JaCoCo + SpotBugs |
| Cobertura frontend | 75% statements, 74% branches, 55% functions, 78% lines |
| Contratos API entre modulos | 7 paquetes api/ con 15 interfaces |
| Decisiones arquitectonicas | 49 ADRs documentados |
| Reglas ArchUnit | 6 reglas activas, allowlists vacias |
| Funcionalidades frontend | 13 con public-api.ts y verificador de fronteras |
