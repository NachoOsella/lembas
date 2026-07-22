---
title: "**Dietetica Lembas**"
sub_title: "Un núcleo comercial para vender, controlar y decidir mejor"
author: "Ignacio Osella · Legajo 412023"
event: "Defensa de Proyecto Final"
date: "2026"
theme:
  path: ./defensa-tesis-gruvbox-dark.yaml
options:
  implicit_slide_ends: false
  end_slide_shorthand: false
  incremental_lists: false
---

<!--
speaker_note: |
  Presentación de aproximadamente 6–7 minutos, seguida de una demostración en vivo.
  Abrir con una frase simple: el proyecto no busca agregar otra pantalla de ventas,
  sino ordenar cada operación comercial en una única fuente de verdad.
-->

El desafío real
===============

<!-- alignment: center -->

<span class="muted">UNA VENTA NO TERMINA EN EL TICKET</span>

<!-- new_lines: 1 -->

<span class="key">Cada venta debería dejar orden, no incertidumbre.</span>

<!-- new_lines: 2 -->

<!-- column_layout: [1, 1, 1] -->

<!-- column: 0 -->

### Mercadería

Lote, vencimiento y disponibilidad.

<!-- column: 1 -->

### Dinero

Pago, efectivo y cierre de caja.

<!-- column: 2 -->

### Información

Pedido, movimiento y trazabilidad.

<!-- reset_layout -->

<!-- new_lines: 1 -->

<span style="color: palette:muted">En una dietética, esas tres realidades deben actualizarse juntas.</span>

<!--
speaker_note: |
  30 segundos. No nombrar tecnologías todavía. Marcar que una venta cambia tres cosas a la vez:
  la mercadería, el dinero y la información disponible para decidir. La solución evita que cada una
  quede registrada en una herramienta distinta.
-->
<!-- end_slide -->

La fragmentación hace reaccionar tarde
=======================================

<!-- alignment: center -->

```text
PLANILLAS Y PAPEL       →  STOCK DESACTUALIZADO
SIN LOTES              →  VENCIMIENTOS INVISIBLES
POS AISLADO            →  DOS CANALES, DOS VERDADES
CAJA MANUAL            →  DIFERENCIAS SIN EXPLICACIÓN
SIN TIENDA ONLINE      →  CLIENTES SIN CANAL DIGITAL
```

<!-- new_lines: 1 -->

> [!IMPORTANT]
> El problema no es la falta de herramientas: es la falta de una **fuente única de información**.

<!--
speaker_note: |
  35 segundos. Leer solo dos pares, no toda la lista. Explicar que cada problema cotidiano
  produce una consecuencia operativa: faltantes, desperdicio o decisiones tomadas tarde.
-->
<!-- end_slide -->

Un núcleo comercial compartido
===============================

<!-- alignment: center -->

```text
              PRODUCTOS · PRECIOS · LOTES · CLIENTES
                                │
                  ┌─────────────┴─────────────┐
                  │   NÚCLEO COMERCIAL ÚNICO  │
                  └─────────────┬─────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            │                                       │
      VENTA EN SUCURSAL                       COMPRA ONLINE
      POS + caja                              Pago + retiro
```

<!-- new_lines: 1 -->

<span class="success">Misma lógica, mismos datos, trazabilidad completa.</span>

<!-- new_lines: 1 -->

El canal cambia; el producto, el stock, el pedido y el pago **siguen siendo los mismos**.

<!--
speaker_note: |
  35 segundos. Esta es la tesis central. No son un ERP y una tienda pegados después:
  ambos canales comparten exactamente el mismo corazón comercial.
-->
<!-- end_slide -->

El stock es mercadería, no un número
======================================

<!-- column_layout: [3, 2] -->

<!-- column: 0 -->

### FEFO: primero vence, primero sale

<span class="key">1° · Lote A · vence 12/08 · 3 u.</span>

↓

<span class="badge">2° · Lote B · vence 29/08 · 4 u.</span>

↓

<span class="muted">Último · Lote C · sin fecha · 10 u.</span>

<!-- column: 1 -->

### Lo que conserva cada lote

- Cantidad disponible
- Vencimiento
- Costo real de recepción
- Historial de movimientos

<!-- reset_layout -->

> [!NOTE]
> Al confirmarse un pago, el sistema descuenta por FEFO. Si se cancela, repone el **mismo lote** utilizado.

<!--
speaker_note: |
  45 segundos. Definir FEFO en lenguaje simple: se entrega primero lo que vence antes.
  Subrayar que cada lote representa mercadería física y permite saber de dónde salió cada unidad.
-->
<!-- end_slide -->

El pago confirmado activa la compra online
===========================================

<!-- alignment: center -->

<span class="badge">1 · Pedido pendiente</span>

Cliente elige productos y confirma el retiro en sucursal.

↓

<span class="key">2 · Mercado Pago procesa el cobro</span>

El cliente paga en una página segura; el sistema todavía no descuenta stock.

↓

<span class="success">3 · Pago aprobado: la operación se vuelve real</span>

Se valida disponibilidad · se descuenta por FEFO · el pedido queda pagado · la sucursal prepara el retiro.

<!-- new_lines: 1 -->

<span style="color: palette:muted">Si el stock ya no alcanza, no hay descuento parcial: el pedido queda identificado para revisión.</span>

<!--
speaker_note: |
  45 segundos. Contar el flujo como una historia. La idea clave es el disparador: no descuenta
  al crear el pedido ni al entregar el retiro; actúa al confirmarse el pago.
-->
<!-- end_slide -->

POS y caja, dentro del mismo núcleo
====================================

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

### En el mostrador

1. Se abre la caja con su fondo inicial.
2. Se buscan o escanean productos.
3. El pago confirma la venta y descuenta lotes por FEFO.
4. Pedido, pago y movimiento quedan vinculados.

<!-- column: 1 -->

### Al cerrar la caja

```text
Efectivo esperado
= fondo inicial
+ ventas en efectivo
+ ingresos manuales
- egresos manuales
```

Si el efectivo contado difiere, se exige registrar el motivo.

<!-- reset_layout -->

> [!TIP]
> QR, transferencia y tarjetas se informan; solo el efectivo físico integra el arqueo de caja.

<!--
speaker_note: |
  40 segundos. Mostrar que la solución entiende la operación real de una caja pequeña.
  Aclarar que otros medios de pago son valiosos para reportes, pero no se cuentan físicamente.
-->
<!-- end_slide -->

Confiabilidad donde importa
============================

<!-- column_layout: [1, 1, 1] -->

<!-- column: 0 -->

### Cobro verificado

Antes de actuar, se comprueba que el pago sea auténtico.

<span style="color: palette:aqua">No se confía ciegamente en un aviso externo.</span>

<!-- column: 1 -->

### Sin doble descuento

Un aviso repetido no duplica la venta ni vuelve a restar stock.

<span style="color: palette:aqua">Una misma operación produce un único efecto.</span>

<!-- column: 2 -->

### Sin sobreventa

Las ventas simultáneas se ordenan antes de tocar los lotes.

<span style="color: palette:aqua">Nunca se venden dos veces las mismas unidades.</span>

<!-- reset_layout -->

<!-- new_lines: 2 -->

<span class="key">La prioridad no es sólo vender: es vender sin perder el control.</span>

<!--
speaker_note: |
  40 segundos. Traducir los tres casos a lenguaje cotidiano: un aviso de pago repetido,
  dos personas comprando lo último disponible, y una confirmación externa que debe verificarse.
-->
<!-- end_slide -->

Resolver primero lo esencial
=============================

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

### El MVP resuelve

- Catálogo, precios y publicación online
- Lotes, vencimientos y trazabilidad
- Ventas POS, caja y arqueo
- Compras, proveedores y costos
- Pedidos online, pago y retiro
- Reportes y recomendaciones por reglas

<!-- column: 1 -->

### Se postergó con criterio

- Entregas a domicilio y logística
- Facturación fiscal
- Checkout como invitado
- Cupones y promociones complejas
- Aplicación móvil nativa
- Chatbot o IA generativa

<!-- reset_layout -->

<span style="color: palette:muted">No incluir todo también es una decisión de diseño: protege la calidad de lo que sí se entrega.</span>

<!--
speaker_note: |
  35 segundos. Defender las exclusiones como gestión responsable del alcance. El retiro en sucursal,
  por ejemplo, permite resolver una compra completa sin sumar una logística que no es central al problema.
-->
<!-- end_slide -->

Simplicidad para un problema serio
===================================

<!-- column_layout: [3, 2] -->

<!-- column: 0 -->

### Una sola aplicación, responsabilidades claras

<span class="key">Monolito modular</span>

Catálogo, inventario, pedidos, pagos, caja, proveedores y reportes se organizan por responsabilidad, pero comparten las reglas que necesitan.

<!-- new_lines: 1 -->

No se eligieron microservicios por moda: para un desarrollo individual habrían agregado infraestructura y complejidad sin valor proporcional.

<!-- column: 1 -->

### Beneficio práctico

- Menos piezas para operar
- Reglas compartidas entre canales
- Límites claros entre áreas
- Evolución sin rehacer el sistema

<!-- reset_layout -->

> [!NOTE]
> Los accesos se separan por rol: cliente, empleado, gerente y administrador.

<!--
speaker_note: |
  35 segundos. Justificar la arquitectura desde el contexto del proyecto, no desde la tecnología.
  La decisión busca mantener claridad, seguridad y evolución posible sin una infraestructura excesiva.
-->
<!-- end_slide -->

Calidad verificable, no declarativa
====================================

<!-- alignment: center -->

<span class="muted">EVIDENCIA AUTOMATIZADA DE LA SOLUCIÓN</span>

<!-- new_lines: 1 -->

<span class="key">1.906 pruebas automatizadas</span>

<!-- new_lines: 1 -->

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

### Cobertura de construcción

```text
920  pruebas backend
986  pruebas frontend
 31  migraciones versionadas
  7  reglas de arquitectura
  4  sprints de desarrollo
```

<!-- column: 1 -->

### Casos que debían resistir

- FEFO y faltantes de stock
- Pagos repetidos y confirmaciones verificadas
- Reposición exacta al cancelar
- Cierres de caja simultáneos
- Límites entre módulos y capas

<!-- reset_layout -->

> [!IMPORTANT]
> No se probaron sólo pantallas: se probaron las reglas que pueden generar pérdidas de stock o de dinero.

<!--
speaker_note: |
  40 segundos. Empezar por 1.906 comprobaciones y luego abrir los dos grupos: construcción
  verificable y reglas críticas. El sentido de los números es mostrar que la calidad se trabaja
  sobre los riesgos reales de dinero y stock, no sólo sobre la interfaz.
-->
<!-- end_slide -->

De la tesis a la demostración
=============================

<!-- alignment: center -->

<span class="muted">AHORA, VERLO FUNCIONANDO</span>

<!-- new_lines: 1 -->

<span class="key">Voy a verificar el circuito completo.</span>

<!-- new_lines: 2 -->

<!-- column_layout: [1, 1] -->

<!-- column: 0 -->

### 01 · Mercadería

Lote, vencimiento y criterio FEFO.

### 02 · Operación

Venta en mostrador o compra online.

<!-- column: 1 -->

### 03 · Confirmación

Pago aprobado y descuento de stock.

### 04 · Resultado

Caja, retiro y trazabilidad del movimiento.

<!-- reset_layout -->

<!-- new_lines: 1 -->

<span style="color: palette:green">Cada operación deja información útil, no trabajo manual pendiente.</span>

<!--
speaker_note: |
  25 segundos. Transición directa a la demo. Enunciar los cuatro puntos para que la profesora
  sepa qué se va a verificar. Tener abierto inventario, una caja abierta, POS y un pedido o movimiento trazable.
  Cerrar la demostración mostrando el resultado final en el stock.
-->
<!-- end_slide -->
