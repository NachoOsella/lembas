# Cambios propuestos en documentación: precios, compras e ingreso de stock

## Objetivo

Este documento resume los cambios que deberían incorporarse a la documentación del proyecto para dejar consistente el manejo de:

- precios de reposición;
- precios de venta;
- histórico de precios;
- órdenes de compra a proveedores;
- recepción/ingreso de mercadería;
- creación de lotes;
- movimientos de stock;
- actualización masiva de precios.

La idea principal es separar correctamente los conceptos de **precio vigente**, **histórico de precios**, **costo real del lote**, **orden de compra** y **recepción de mercadería**.

---

# 1. Decisión general de dominio

El sistema debe distinguir cuatro conceptos de precio:

| Concepto | Qué significa | Dónde se guarda |
|---|---|---|
| Precio de reposición | Último costo conocido para reponer un producto con un proveedor específico | `supplier_products.current_cost` |
| Histórico de reposición | Historial de cambios del costo de reposición por proveedor-producto | `supplier_product_cost_history` |
| Precio de venta actual | Precio vigente usado por POS y tienda online | `products.sale_price` |
| Histórico de precio de venta | Historial de cambios del precio de venta del producto | `product_sale_price_history` |
| Costo real del lote | Costo unitario real de la mercadería recibida | `stock_lots.unit_cost` |
| Precio vendido | Precio congelado al momento de la venta | `order_items.unit_price` |

Regla central:

```text
products.sale_price y supplier_products.current_cost son valores operativos actuales.
Los históricos se guardan en tablas separadas.
Los lotes guardan el costo real de entrada y no se modifican por aumentos futuros.
```

---

# 2. Cambios sobre `products`

Actualmente `products.sale_price` representa el precio actual de venta. Eso debe mantenerse porque simplifica consultas del catálogo, POS y tienda online.

## Mantener

```sql
products.sale_price
```

Debe seguir representando:

```text
Precio actual de venta del producto.
```

## Cambiar documentación

Reemplazar la idea de:

```text
History in audit_logs
```

por:

```text
Current sale price is stored in products.sale_price for operational queries.
Historical sale prices are stored in product_sale_price_history.
audit_logs records who performed critical changes, but it is not the source for price history queries.
```

## Justificación

`audit_logs` sirve para auditoría general, pero no es cómodo ni correcto como fuente de consultas comerciales del tipo:

- ¿A cuánto vendíamos este producto en mayo?
- ¿Cuánto aumentó este producto en los últimos 30 días?
- ¿Qué margen tenía antes del último aumento?
- ¿Qué productos tuvieron más variación de precio?

---

# 3. Nueva tabla: `product_sale_price_history`

Agregar una tabla para registrar el histórico real de precios de venta.

```sql
CREATE TABLE product_sale_price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),

    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2) NOT NULL CHECK (new_price >= 0),

    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,

    reason VARCHAR(100),
    source VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id BIGINT,

    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Campos importantes

| Campo | Uso |
|---|---|
| `old_price` | Precio anterior |
| `new_price` | Nuevo precio aplicado |
| `valid_from` | Desde cuándo entra en vigencia |
| `valid_to` | Hasta cuándo estuvo vigente |
| `reason` | Motivo: aumento proveedor, ajuste manual, promoción, corrección |
| `source` | Origen del cambio: manual, batch, recepción, importación |
| `reference_type` | Entidad que originó el cambio |
| `reference_id` | ID de la entidad que originó el cambio |

## Regla de negocio

Cuando cambia `products.sale_price`:

```text
1. Se cierra el histórico vigente con valid_to = now().
2. Se inserta un nuevo registro en product_sale_price_history.
3. Se actualiza products.sale_price.
```

---

# 4. Cambios sobre `supplier_products`

La relación `supplier_products` debe representar que un mismo producto puede ser ofrecido por varios proveedores.

## Mantener

```sql
supplier_products
-----------------
id
product_id
supplier_id
supplier_sku
current_cost
is_preferred
created_at
updated_at
```

## Interpretación correcta

`current_cost` debe documentarse como:

```text
Último precio de reposición conocido para ese producto con ese proveedor.
```

También puede llamarse conceptualmente:

```text
current_replacement_cost
```

No es necesario renombrar la columna si ya está implementada, pero la documentación debe aclarar su significado.

## Regla

Un producto puede tener varios proveedores:

```text
Producto A
  - Proveedor 1: current_cost = 5200
  - Proveedor 2: current_cost = 5450
  - Proveedor 3: current_cost = 5100
```

`is_preferred` permite definir cuál proveedor se usa como referencia principal para cálculo de precio sugerido.

---

# 5. Nueva tabla: `supplier_product_cost_history`

Agregar histórico de costos de reposición.

```sql
CREATE TABLE supplier_product_cost_history (
    id BIGSERIAL PRIMARY KEY,
    supplier_product_id BIGINT NOT NULL REFERENCES supplier_products(id),

    old_cost DECIMAL(12,2),
    new_cost DECIMAL(12,2) NOT NULL CHECK (new_cost >= 0),

    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,

    source VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id BIGINT,

    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Regla de negocio

Cuando cambia `supplier_products.current_cost`:

```text
1. Se cierra el histórico vigente con valid_to = now().
2. Se inserta un nuevo registro en supplier_product_cost_history.
3. Se actualiza supplier_products.current_cost.
```

## Fuentes posibles del cambio

```text
MANUAL_UPDATE
SUPPLIER_PRICE_LIST
PURCHASE_ORDER
PURCHASE_RECEIPT
PRICE_UPDATE_BATCH
```

---

# 6. Costo real del lote

El costo real del lote debe guardarse en `stock_lots`.

## Cambio recomendado

Si actualmente la columna se llama:

```sql
cost_price
```

se puede mantener, pero la documentación debería llamarlo conceptualmente:

```text
unit_cost
```

Si todavía estás a tiempo de renombrarlo, usar:

```sql
unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0)
```

## Regla de negocio

```text
El costo del lote se toma desde la recepción de mercadería.
Una vez creado el lote, el costo unitario queda congelado.
Los aumentos futuros del proveedor no modifican lotes existentes.
```

Ejemplo:

```text
Recepción:
Yerba x 24 unidades
Costo real unitario: $5300

Resultado:
stock_lots.unit_cost = 5300
```

Si luego el proveedor aumenta a $5800:

```text
supplier_products.current_cost = 5800
stock_lots.unit_cost = 5300
```

---

# 7. Cambios sobre `stock_lots`

La tabla de lotes debe representar mercadería física existente.

## Estructura recomendada

```sql
CREATE TABLE stock_lots (
    id BIGSERIAL PRIMARY KEY,

    product_id BIGINT NOT NULL REFERENCES products(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),

    supplier_id BIGINT REFERENCES suppliers(id),
    supplier_product_id BIGINT REFERENCES supplier_products(id),

    purchase_receipt_id BIGINT,
    purchase_receipt_item_id BIGINT,

    lot_code VARCHAR(100),
    expiration_date DATE,

    initial_quantity DECIMAL(12,3) NOT NULL CHECK (initial_quantity > 0),
    quantity_available DECIMAL(12,3) NOT NULL CHECK (quantity_available >= 0),

    unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Campos nuevos recomendados

| Campo | Motivo |
|---|---|
| `initial_quantity` | Permite saber cuánto entró originalmente en el lote |
| `supplier_id` | Permite rastrear proveedor de origen |
| `supplier_product_id` | Permite rastrear relación proveedor-producto |
| `purchase_receipt_id` | Permite rastrear recepción de origen |
| `purchase_receipt_item_id` | Permite rastrear línea exacta de recepción |
| `unit_cost` | Costo real congelado del lote |

## Regla

```text
stock_lots representa el estado actual del stock físico.
stock_movements representa la historia de cambios.
```

---

# 8. Stock movements

`stock_movements` debe seguir siendo la trazabilidad de cada cambio de stock.

## Estructura recomendada

```sql
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,

    product_id BIGINT NOT NULL REFERENCES products(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    stock_lot_id BIGINT REFERENCES stock_lots(id),

    type VARCHAR(50) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,

    unit_cost_snapshot DECIMAL(12,2),

    reason TEXT,

    reference_type VARCHAR(50),
    reference_id BIGINT,

    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tipos recomendados

```text
PURCHASE_ENTRY
POS_SALE
ONLINE_SALE
CANCELLATION_RETURN
MANUAL_ADJUSTMENT
WASTE
INTERNAL_CONSUMPTION
TRANSFER_OUT
TRANSFER_IN
```

## Regla

Cada recepción confirmada genera:

```text
stock_movements.type = PURCHASE_ENTRY
```

Cada venta genera:

```text
POS_SALE u ONLINE_SALE
```

Cada cancelación que devuelve stock genera:

```text
CANCELLATION_RETURN
```

---

# 9. Compra a proveedores: proceso recomendado

El proceso debe separarse en dos etapas:

```text
1. Orden de compra
2. Recepción de mercadería
```

La orden de compra no toca stock.

La recepción de mercadería sí toca stock.

---

# 10. Purchase orders

La orden de compra representa la intención de compra al proveedor.

```sql
CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,

    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),

    status VARCHAR(30) NOT NULL,

    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_delivery_date DATE,

    notes TEXT,

    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);
```

## Estados recomendados

```text
DRAFT
CONFIRMED
SENT
PARTIALLY_RECEIVED
RECEIVED
CANCELLED
```

## Regla

```text
Una orden de compra no modifica stock.
Solo define qué productos se esperan recibir desde un proveedor.
```

---

# 11. Purchase order items

```sql
CREATE TABLE purchase_order_items (
    id BIGSERIAL PRIMARY KEY,

    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id),

    product_id BIGINT NOT NULL REFERENCES products(id),
    supplier_product_id BIGINT REFERENCES supplier_products(id),

    quantity_ordered DECIMAL(12,3) NOT NULL CHECK (quantity_ordered > 0),

    unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),

    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Regla

El costo de la orden se precarga desde:

```text
supplier_products.current_cost
```

Pero puede editarse si el proveedor cotiza distinto.

---

# 12. Purchase receipts

La recepción representa la llegada real de mercadería.

```sql
CREATE TABLE purchase_receipts (
    id BIGSERIAL PRIMARY KEY,

    purchase_order_id BIGINT REFERENCES purchase_orders(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),

    status VARCHAR(30) NOT NULL,

    invoice_number VARCHAR(100),
    received_at TIMESTAMPTZ,
    received_by_user_id BIGINT REFERENCES users(id),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ
);
```

## Estados recomendados

```text
DRAFT
CONFIRMED
CANCELLED
```

## Regla

```text
La recepción es la entidad que aumenta el stock.
Al confirmarse, crea lotes y movimientos de stock.
```

---

# 13. Purchase receipt items

```sql
CREATE TABLE purchase_receipt_items (
    id BIGSERIAL PRIMARY KEY,

    purchase_receipt_id BIGINT NOT NULL REFERENCES purchase_receipts(id),
    purchase_order_item_id BIGINT REFERENCES purchase_order_items(id),

    product_id BIGINT NOT NULL REFERENCES products(id),
    supplier_product_id BIGINT REFERENCES supplier_products(id),

    quantity_received DECIMAL(12,3) NOT NULL CHECK (quantity_received > 0),

    unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),

    expiration_date DATE,
    lot_code VARCHAR(100),

    created_stock_lot_id BIGINT,

    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Regla

El empleado no debería cargar todo desde cero.

Debe abrir una orden de compra existente y completar:

```text
cantidad recibida
fecha de vencimiento
código de lote
costo real si cambió
observaciones
```

---

# 14. Flujo completo: orden de compra e ingreso de stock

## Paso 1: admin/gerente crea orden de compra

```text
Proveedor: Distribuidora Córdoba
Sucursal: Casa Central
Fecha estimada: 2026-06-15
```

Items:

```text
Yerba Playadito 1kg x 24 unidades a $5200
Miel 500g x 12 unidades a $3900
Granola 1kg x 8 unidades a $7000
```

La orden queda en estado:

```text
DRAFT o CONFIRMED
```

No se modifica stock.

---

## Paso 2: llega mercadería

El empleado abre:

```text
Recepción de orden de compra #15
```

El sistema muestra los productos ya pedidos.

El empleado completa:

```text
cantidad recibida
vencimiento
lote
costo real
```

---

## Paso 3: confirmar recepción

Al confirmar, dentro de una transacción:

```text
1. Se crean stock_lots.
2. Se crean stock_movements con type = PURCHASE_ENTRY.
3. Se actualiza el estado de la orden de compra.
4. Si llegó todo, purchase_orders.status = RECEIVED.
5. Si llegó una parte, purchase_orders.status = PARTIALLY_RECEIVED.
6. Si el costo real cambió, se puede actualizar supplier_products.current_cost.
7. Si cambia el costo de reposición, se registra supplier_product_cost_history.
8. Opcionalmente se genera sugerencia de nuevo precio de venta.
```

---

# 15. Casos especiales en recepción

## Llega menos cantidad

Ejemplo:

```text
Pedido: 12 unidades
Recibido: 10 unidades
```

Resultado:

```text
purchase_order.status = PARTIALLY_RECEIVED
```

El sistema debe permitir:

```text
recibir el faltante más adelante
```

o:

```text
cerrar la orden con faltante
```

---

## Llega más cantidad

Ejemplo:

```text
Pedido: 12 unidades
Recibido: 15 unidades
```

El sistema debe permitirlo solo si el usuario tiene permiso.

Debe quedar trazado en la recepción.

---

## Llega un producto no pedido

Permitir agregar un item extra en recepción:

```text
purchase_receipt_items.purchase_order_item_id = null
```

Regla:

```text
Los productos no pedidos pueden recibirse manualmente, pero deben quedar identificados como extra.
```

---

## El costo real difiere del costo ordenado

Ejemplo:

```text
Costo ordenado: $5200
Costo recibido/facturado: $5400
```

El sistema debe avisar:

```text
El costo recibido difiere del costo actual del proveedor.
¿Actualizar precio de reposición?
```

Si se confirma:

```text
supplier_products.current_cost = 5400
supplier_product_cost_history + nuevo registro
```

Siempre:

```text
stock_lots.unit_cost = 5400
```

---

# 16. Actualización masiva de precios de proveedor

Además de cambiar costos desde recepción, el sistema debe permitir actualizar precios cuando el proveedor manda una nueva lista.

Esto no modifica stock.

## Nueva tabla: `price_update_batches`

```sql
CREATE TABLE price_update_batches (
    id BIGSERIAL PRIMARY KEY,

    supplier_id BIGINT REFERENCES suppliers(id),

    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,

    source_file_name VARCHAR(255),
    increase_percentage DECIMAL(8,3),

    pricing_rule_id BIGINT,

    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    applied_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    notes TEXT
);
```

## Tipos

```text
SUPPLIER_FILE
PERCENTAGE_INCREASE
MANUAL_GRID
```

## Estados

```text
DRAFT
VALIDATED
APPLIED
CANCELLED
```

---

# 17. Price update batch items

```sql
CREATE TABLE price_update_batch_items (
    id BIGSERIAL PRIMARY KEY,

    batch_id BIGINT NOT NULL REFERENCES price_update_batches(id),

    supplier_product_id BIGINT REFERENCES supplier_products(id),
    product_id BIGINT REFERENCES products(id),

    old_cost DECIMAL(12,2),
    new_cost DECIMAL(12,2),

    old_sale_price DECIMAL(12,2),
    suggested_sale_price DECIMAL(12,2),
    final_sale_price DECIMAL(12,2),

    apply_cost_update BOOLEAN DEFAULT true,
    apply_sale_price_update BOOLEAN DEFAULT true,

    status VARCHAR(30) NOT NULL,
    error_message TEXT
);
```

## Flujo

```text
1. El admin selecciona proveedor.
2. Sube Excel/CSV o indica porcentaje general.
3. El sistema matchea productos por supplier_sku, barcode o nombre.
4. Se genera preview.
5. Se calculan nuevos costos.
6. Se sugieren nuevos precios de venta.
7. El admin revisa y puede excluir productos.
8. El admin confirma.
9. Se actualiza supplier_products.current_cost.
10. Se registra supplier_product_cost_history.
11. Se actualiza products.sale_price si corresponde.
12. Se registra product_sale_price_history.
```

---

# 18. Pricing rules

Para calcular automáticamente precios de venta sugeridos, agregar reglas de pricing.

```sql
CREATE TABLE pricing_rules (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    category_id BIGINT REFERENCES categories(id),
    product_id BIGINT REFERENCES products(id),

    target_margin_percentage DECIMAL(5,2) NOT NULL,
    rounding_multiple DECIMAL(12,2) NOT NULL DEFAULT 100,

    active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Regla de aplicación

Prioridad recomendada:

```text
1. Regla específica del producto
2. Regla de la categoría
3. Regla general/default
```

## Fórmula recomendada

```text
sale_price = replacement_cost / (1 - margin)
```

Ejemplo:

```text
Costo de reposición: $5200
Margen objetivo: 35%

sale_price = 5200 / (1 - 0.35)
sale_price = 8000
```

Luego se aplica redondeo:

```text
8123 -> 8200
8070 -> 8100
```

---

# 19. De dónde sale el costo base para sugerir precio de venta

Orden recomendado:

```text
1. Proveedor preferido del producto.
2. Si no hay proveedor preferido, menor current_cost activo.
3. Si no hay proveedor asociado, último costo de lote.
4. Si no hay datos, precio manual.
```

---

# 20. Flujo de actualización de precios

## Proveedor cambia lista de precios

```text
Proveedor manda nueva lista
        ↓
Admin crea price_update_batch
        ↓
Sistema calcula cambios de costo
        ↓
Sistema calcula precios de venta sugeridos
        ↓
Admin revisa preview
        ↓
Admin confirma
        ↓
Se actualizan costos de reposición
        ↓
Se actualizan precios de venta si corresponde
        ↓
Se guarda histórico
```

## Importante

No se debe aplicar automáticamente sin revisión.

El impacto automático debe ocurrir recién al confirmar el batch.

Motivo:

```text
Si el archivo del proveedor está mal, podría romper todo el catálogo.
```

---

# 21. Relación entre recepción y precios

Cuando se confirma una recepción:

```text
purchase_receipt_item.unit_cost
        ↓
stock_lots.unit_cost
```

Si el costo recibido difiere del costo vigente del proveedor:

```text
purchase_receipt_item.unit_cost != supplier_products.current_cost
```

El sistema debe ofrecer:

```text
Actualizar precio de reposición del proveedor
```

Si se acepta:

```text
supplier_products.current_cost se actualiza
supplier_product_cost_history registra el cambio
```

Opcionalmente:

```text
Se genera sugerencia de nuevo precio de venta
```

---

# 22. Relación entre orden de compra y precios

Cuando se crea una orden de compra:

```text
purchase_order_items.unit_cost
```

se precarga desde:

```text
supplier_products.current_cost
```

Pero queda congelado en la orden.

Si luego cambia el costo del proveedor:

```text
supplier_products.current_cost cambia
```

no debería modificar automáticamente órdenes ya confirmadas.

Regla:

```text
La orden de compra guarda el costo esperado al momento de ser creada.
La recepción guarda el costo real al momento de recibir.
El lote guarda el costo real recibido.
```

---

# 23. UX recomendada

## Pantalla: crear orden de compra

Ruta sugerida:

```text
Backoffice > Compras > Nueva orden
```

Campos superiores:

```text
Proveedor
Sucursal
Fecha esperada
Notas
```

Grilla:

| Producto | SKU proveedor | Cantidad | Costo unitario | Subtotal |
|---|---|---:|---:|---:|

Funciones:

```text
Buscar producto por nombre, barcode o SKU proveedor.
Autocompletar costo desde supplier_products.current_cost.
Permitir editar costo.
Calcular subtotal.
Guardar como borrador.
Confirmar orden.
```

---

## Pantalla: recibir orden de compra

Ruta sugerida:

```text
Backoffice > Compras > Recepciones
```

La pantalla debe partir de una orden existente.

Grilla:

| Producto | Pedido | Recibido | Vencimiento | Lote | Costo real |
|---|---:|---:|---|---|---:|

Funciones:

```text
Precargar productos desde purchase_order_items.
Permitir cargar cantidad recibida.
Permitir cargar vencimiento.
Permitir cargar lote.
Permitir ajustar costo real.
Validar cantidades.
Confirmar recepción.
Crear lotes automáticamente.
Crear movimientos automáticamente.
```

---

## Pantalla: actualizar precios

Ruta sugerida:

```text
Backoffice > Proveedores > Actualizar precios
```

Opciones:

```text
Subir Excel/CSV
Aplicar porcentaje general
Editar grilla manualmente
```

Preview:

| Producto | Costo anterior | Costo nuevo | Venta actual | Venta sugerida | Venta final | Aplicar |
|---|---:|---:|---:|---:|---:|---|

Funciones:

```text
Mostrar diferencias.
Permitir excluir productos.
Permitir editar precio final.
Aplicar cambios en lote.
Guardar histórico.
```

---

# 24. Cambios necesarios en documentación

## `docs/02-domain/entities.md`

Agregar o actualizar entidades:

```text
supplier_product_cost_history
product_sale_price_history
pricing_rules
price_update_batches
price_update_batch_items
purchase_orders
purchase_order_items
purchase_receipts
purchase_receipt_items
```

Actualizar `StockLot`:

```text
Debe guardar initial_quantity, quantity_available y unit_cost.
El unit_cost representa el costo real congelado del lote.
```

Actualizar `Product`:

```text
sale_price es precio actual operativo.
El histórico está en product_sale_price_history.
```

Actualizar `SupplierProduct`:

```text
current_cost es precio de reposición actual por proveedor.
El histórico está en supplier_product_cost_history.
```

---

## `docs/02-domain/domain-model.md`

Actualizar diagrama ER para incluir:

```text
SUPPLIER ||--o{ PURCHASE_ORDER
PURCHASE_ORDER ||--o{ PURCHASE_ORDER_ITEM
PURCHASE_ORDER ||--o{ PURCHASE_RECEIPT
PURCHASE_RECEIPT ||--o{ PURCHASE_RECEIPT_ITEM
PURCHASE_RECEIPT_ITEM ||--|| STOCK_LOT

SUPPLIER_PRODUCT ||--o{ SUPPLIER_PRODUCT_COST_HISTORY
PRODUCT ||--o{ PRODUCT_SALE_PRICE_HISTORY
PRICE_UPDATE_BATCH ||--o{ PRICE_UPDATE_BATCH_ITEM
PRICING_RULE ||--o{ PRICE_UPDATE_BATCH
```

Agregar decisiones:

```text
Purchase orders do not affect stock.
Purchase receipts affect stock.
Stock lots store the real received unit cost.
Supplier price updates do not modify existing stock lots.
Current prices are denormalized for operational speed.
Historical prices are stored in dedicated history tables.
```

---

## `docs/02-domain/stock-rules.md`

Agregar reglas:

```text
Stock increases only when a purchase receipt is confirmed.
Purchase orders do not affect stock.
Each confirmed receipt item creates a stock lot.
Each created lot generates a PURCHASE_ENTRY movement.
The unit cost of a stock lot is immutable.
Existing lots are never updated by supplier price changes.
```

---

## `docs/03-architecture/database-design.md`

Actualizar diseño de base de datos con las nuevas tablas:

```text
supplier_product_cost_history
product_sale_price_history
pricing_rules
price_update_batches
price_update_batch_items
purchase_orders
purchase_order_items
purchase_receipts
purchase_receipt_items
```

Actualizar `stock_lots`.

Actualizar `stock_movements`.

Actualizar el migration plan.

---

## `docs/04-processes/`

Crear o actualizar procesos:

```text
purchase-order-flow.md
purchase-receipt-flow.md
supplier-price-update-flow.md
sale-price-history-flow.md
```

---

# 25. Orden recomendado de implementación

Si ya está implementado el proceso base de orden de compra e ingreso de stock, seguir este orden:

## Paso 1

Ajustar documentación y modelo conceptual:

```text
precio de reposición
precio de venta
histórico
costo real del lote
```

## Paso 2

Agregar tablas de histórico:

```text
supplier_product_cost_history
product_sale_price_history
```

## Paso 3

Asegurar que cambios manuales de precio creen histórico.

## Paso 4

Asegurar que la recepción use `unit_cost` real y pueda actualizar costo de reposición.

## Paso 5

Agregar pricing rules.

## Paso 6

Agregar price update batches para actualización masiva.

---

# 26. Resumen final

El modelo recomendado queda así:

```text
products
categories

suppliers
supplier_products
supplier_product_cost_history

product_sale_price_history
pricing_rules

price_update_batches
price_update_batch_items

purchase_orders
purchase_order_items

purchase_receipts
purchase_receipt_items

stock_lots
stock_movements

orders
order_items
payments
cash_sessions
```

La lógica final del sistema debe ser:

```text
El proveedor ofrece productos con un costo de reposición actual.
Ese costo tiene histórico.

El producto tiene un precio de venta actual.
Ese precio tiene histórico.

El admin crea una orden de compra usando costos actuales.
La orden no toca stock.

Cuando llega la mercadería, el empleado recibe la orden.
La recepción crea lotes y movimientos.
Cada lote guarda su costo real congelado.

Si el proveedor cambia precios, se crea un batch.
El batch actualiza costos de reposición.
El sistema sugiere nuevos precios de venta usando reglas de margen.
El admin confirma.
Los productos se actualizan y se guarda histórico.
```
