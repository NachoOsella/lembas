# Justificacion Tecnica (Technical Justification)

## Decisiones Arquitectonicas

### Por que monolito modular?

La decision de adoptar un monolito modular responde a las restricciones y objetivos del proyecto:

| Criterio | Monolito Modular | Monolito Tradicional | Microservicios |
|---|---|---|---|
| Velocidad de desarrollo (1 desarrollador) | Alta | Alta | Baja (overhead de infraestructura) |
| Depuracion | Simple | Simple | Compleja (trazado distribuido) |
| Despliegue | Un artefacto | Un artefacto | Multiples servicios |
| Tests de integracion | Simples | Simples | Complejos (contract tests) |
| Escalabilidad | Vertical | Vertical | Horizontal |
| Separacion de dominios | Por paquetes + ArchUnit | Por capas | Por red |
| Curva de aprendizaje | Moderada | Baja | Alta |
| Costo operativo | Bajo | Bajo | Alto (CI/CD, monitoreo) |

El monolito modular (Vernon, 2013) proporciona separacion de dominios a traves de la estructura de paquetes y contratos API explicitos (paquetes `api/`) sin la complejidad operativa de los microservicios (Newman, 2021). Cada modulo es un bounded context autonomo que expone una interfaz publica y oculta su implementacion interna. Las reglas arquitectonicas se verifican automaticamente con ArchUnit en tiempo de compilacion. Si el sistema requiriera microservicios en el futuro, cada modulo puede extraerse independientemente siguiendo los mismos contratos `api/`.

### Por que PostgreSQL?

- Soporte transaccional fuerte (ACID) requerido para operaciones FEFO de stock
- Integracion madura con JPA/Hibernate (Spring Data JPA)
- Soporte JSONB para metadatos flexibles (datos de webhook de pagos)
- CHECK constraints para integridad de datos a nivel de base de datos
- Testcontainers permite tests de integracion con PostgreSQL real en entornos CI
- Indices parciales y bloqueos pesimistas (SELECT FOR UPDATE) para concurrencia

Comparado con MySQL 8, PostgreSQL ofrece mejor soporte para tipos de datos avanzados (rangos de fechas para historicos de precios, indices parciales unicos) y cumplimiento de ACID mas estricto en escenarios de alta concurrencia. MongoDB y otras bases NoSQL fueron descartadas por la necesidad de integridad transaccional en operaciones de stock y pagos.

### Por que Angular con Senales (Signals)?

- Tipado fuerte con TypeScript
- Signals para manejo de estado reactivo (mas simple que enfoques basados solo en RxJS)
- Componentes standalone (Angular moderno, sin NgModules)
- PrimeNG proporciona componentes de backoffice listos para produccion (tablas, dialogos, formularios)
- Lazy loading por defecto para todas las rutas de funcionalidades

Se descarto React/Next.js por la madurez del ecosistema Angular+PrimeNG para aplicaciones de gestion empresarial, y Vue.js por el menor soporte de librerias de componentes para backoffice.

### Por que Mercado Pago Checkout Pro?

- Proveedor de pagos mas utilizado en Argentina (Gonzalez & Martinez, 2024)
- Checkout alojado reduce el alcance de cumplimiento PCI DSS
- Modelo de notificacion webhook se adapta al procesamiento asincronico de ordenes
- Entorno sandbox para desarrollo y pruebas
- Integracion REST directa sin SDK propietarios pesados

## Decisiones de Dominio

### Modelo de orden unificado

Combinar ordenes POS y ONLINE en una sola tabla `orders`:
- Elimina logica de negocio duplicada (FEFO, transiciones de estado, calculos de total)
- Permite reportes multicanal (ventas POS + ONLINE en un mismo query)
- Simplifica la deduccion de stock (misma logica FEFO para ambos canales)
- El canal se distingue por un campo `type` (POS | ONLINE)
- Las diferencias de comportamiento se modelan en la maquina de estados (OrderStatePolicy)

Alternativa considerada y rechazada: tablas separadas `pos_orders` y `online_orders` con una vista unificada. Descartada por la complejidad adicional sin beneficio proporcional y por la imposibilidad de compartir logica de transicion de estados.

### Stock por lotes como unica fuente de verdad

No existen tablas desnormalizadas de stock:
- Elimina problemas de sincronizacion entre una cache de stock y los lotes reales
- El ordenamiento FEFO se resuelve a nivel de repositorio con una unica consulta
- Trazabilidad completa de cada unidad de producto
- La cancelacion revierte a los mismos lotes exactos que se dedujeron originalmente
- El saldo disponible es siempre SUM(quantity_available) de los lotes activos

### Diseno de caja registradora

La caja registradora solo cuenta fisicamente el efectivo porque:
- En comercios pequenos, el efectivo es el unico medio de pago que reside fisicamente en la caja
- Los pagos con QR, transferencia y tarjeta van directamente a la cuenta bancaria del comercio
- El reporte de cierre muestra todos los metodos pero solo concilia el efectivo
- Esto refleja la operacion real de una dietetica en Argentina

### Separacion de precios y costos

El diseno separa cuatro conceptos de valor:
1. Precio de venta actual (`products.sale_price`) - valor operativo para POS y tienda online
2. Historico de precios de venta (`product_sale_price_history`) - analisis comercial
3. Costo de reposicion actual (`supplier_products.current_cost`) - ultimo costo conocido por proveedor
4. Costo real de lote (`stock_lots.unit_cost`) - costo congelado al recibir la mercaderia

Esta separacion sigue el principio de Command Query Responsibility Segregation (CQRS) aplicado a nivel de esquema: las lecturas operativas usan campos directos, mientras que las consultas analiticas usan tablas historicas dedicadas (Fowler, 2002).

## Mitigacion de Riesgos

| Riesgo | Mitigacion | Verificacion |
|---|---|---|
| Sobreventa por concurrencia POS + webhook | Bloqueo pesimista SELECT FOR UPDATE sobre stock_lots | Tests de concurrencia con latches + TransactionTemplate |
| Webhook MP duplicado | Idempotencia por provider_payment_id | Test de doble entrega: segunda llamada retorna 200 sin efectos |
| Discrepancia de caja sin justificacion | Motivo obligatorio, registro de quien abre y cierra | Test de cierre sin motivo rechazado con 400 |
| Confusion de roles | Espacios de ruta separados (/api/customer/ vs /api/admin/) | @PreAuthorize en cada controlador + test MVC |
| Scope creep | Documento de fuera de alcance explicito, ADR para cada exclusion | Verificacion contra el backlog de Jira |
| Violacion de limites entre modulos | ArchUnit con allowlists vacias + frontend boundary checker | Tests arquitectonicos en CI |

## Referencias

Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley.

Newman, S. (2021). *Building Microservices: Designing Fine-Grained Systems* (2nd ed.). O'Reilly Media.

Vernon, V. (2013). *Implementing Domain-Driven Design*. Addison-Wesley.
