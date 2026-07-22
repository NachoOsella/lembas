# Metodología de Desarrollo e Ingeniería de Software

**Autor:** Ignacio Osella (Legajo 412023)
**Proyecto:** Sistema de Gestión Comercial Integrada con Comercio Electrónico para Dietética Lembas
**Fecha:** Julio 2026

---

## Resumen

El presente documento describe la metodología de desarrollo empleada para la construcción del Sistema de Gestión Comercial Integrada con Comercio Electrónico para Dietética Lembas. Se detallan el marco de trabajo ágil basado en Scrum, el proceso de ingeniería de software, la estrategia de calidad, el uso de asistentes de inteligencia artificial y las herramientas y versiones utilizadas. El proyecto fue desarrollado por un único desarrollador durante un período de ocho semanas, organizado en cuatro sprints de dos semanas cada uno, comprendiendo 48 historias de usuario y 300 puntos de historia.

---

## 1. Metodología de Investigación y Desarrollo

### 1.1 Marco de trabajo: Scrum adaptado para un solo desarrollador

El proyecto adoptó Scrum como marco de trabajo ágil, adaptado a la realidad de un equipo de un solo desarrollador. Si bien Scrum fue concebido para equipos multifuncionales, sus principios de iteraciones con entregables funcionales, priorización por valor de negocio, retrospectivas continuas y transparencia del progreso resultaron aplicables y beneficiosos. La adaptación principal consistió en que el único desarrollador asumió los roles de *Product Owner*, *Scrum Master* y equipo de desarrollo, manteniendo la disciplina de las ceremonias de forma auto-gestionada.

La elección de Scrum se fundamentó en los siguientes criterios:

- **Entregas incrementales:** cada sprint debía producir funcionalidad integrada y desplegable, reduciendo el riesgo de integración tardía.
- **Adaptabilidad:** los requisitos podían refinarse al inicio de cada sprint en función del *feedback* del negocio real.
- **Visibilidad del progreso:** el *backlog* priorizado y los sprints permitían seguir el avance contra el cronograma académico.
- **Gestión de alcance:** el marco facilitó la contención del alcance dentro de las ocho semanas previstas.

### 1.2 Estructura del proyecto

El proyecto se organizó en cuatro sprints de dos semanas cada uno, totalizando ocho semanas de desarrollo. Cada sprint comprendió 12 historias de usuario y 75 puntos de historia, distribuidos de la siguiente manera:

| Sprint | Duración | Historias | Puntos | Objetivo |
|--------|----------|-----------|--------|----------|
| Sprint 1 | Semanas 1-2 | 12 | 75 | Fundación del proyecto, autenticación y catálogo |
| Sprint 2 | Semanas 3-4 | 12 | 75 | Modelo de *stock*, órdenes, carrito y proveedores |
| Sprint 3 | Semanas 5-6 | 13 | 80 | Mercado Pago, caja registradora y POS |
| Sprint 4 | Semanas 7-8 | 12 | 75 | Órdenes *backoffice*, reportes, seguridad y despliegue |

**Total: 49 historias de usuario, 305 puntos de historia** (incluye una historia adicional agregada en Sprint 3 para Términos y Condiciones y FAQ).

### 1.3 Obtención de requisitos desde el negocio real

Los requisitos fueron obtenidos directamente del funcionamiento real de Dietética Lembas, una dietética ubicada en la ciudad de Trelew, provincia del Chubut, Argentina. El proceso de relevamiento incluyó:

1. **Observación directa:** se presenciaron jornadas completas de operación en el local, documentando el flujo de venta presencial, el manejo de efectivo, la reposición de *stock* y la interacción con proveedores.
2. **Entrevistas con el propietario:** se mantuvieron reuniones semiestructuradas para comprender las necesidades actuales, los puntos de dolor (control de *stock* en papel, falta de *unified view* de ventas, actualización manual de precios) y las expectativas sobre el sistema.
3. **Análisis de documentos operativos:** se revisaron planillas de *stock*, registros de caja, facturas de proveedores y listas de precios actuales.
4. **Validación iterativa:** al final de cada *sprint*, se presentaron los incrementos al propietario para validar que las funcionalidades desarrolladas reflejaban fielmente la operación real.

Este enfoque aseguró que el sistema no fuera un ejercicio académico abstracto, sino una solución concreta para un problema real de gestión comercial.

### 1.4 Planificación de sprints

Al inicio de cada *sprint* se realizaba una sesión de planificación con las siguientes actividades:

1. **Refinamiento del *backlog*:** se revisaban las historias de usuario pendientes, se descomponían en tareas técnicas y se ajustaban las estimaciones en puntos de historia utilizando la secuencia de Fibonacci (1, 2, 3, 5, 8, 13).
2. **Selección de historias:** se seleccionaban las historias de mayor prioridad de negocio que cupieran en la capacidad estimada del *sprint* (75 puntos), considerando dependencias técnicas entre historias.
3. **Definición de "Listo" (*Definition of Done*):** cada historia debía cumplir con: código implementado, pruebas unitarias y de integración pasando, cobertura dentro de los umbrales, documentación de API actualizada, verificación de estilo y *linter*, y *build* exitoso.
4. **Descomposición en tareas:** cada historia se descomponía en subtareas técnicas con estimación en horas ideales, registradas en Jira.

### 1.5 Flujo de trabajo diario

El flujo de trabajo diario se organizó en ciclos de desarrollo que combinaban escritura de código, pruebas y documentación:

1. **Selección de tarea:** se tomaba una tarea del *backlog* del *sprint* desde la columna "To Do" en Jira.
2. **Rama de *feature*:** se creaba una rama Git desde `main` con el formato `feat/LEMBAS-nnn-descripción-breve` o `fix/LEMBAS-nnn-descripción-breve`.
3. **Desarrollo con TDD cuando aplicaba:** para lógica de dominio crítica (reglas FEFO, cálculo de cierre de caja, máquina de estados de órdenes), se escribía primero la prueba, luego la implementación y finalmente se refactorizaba.
4. **Verificación local:** se ejecutaban las pruebas del módulo afectado y las pruebas de regresión completas.
5. ***Commit* convencional:** se realizaba *commit* con mensaje siguiendo el formato *Conventional Commits*.
6. **Integración continua local:** antes de integrar a `main`, se ejecutaba el *pipeline* completo de verificación (*build*, *tests*, *linters*, cobertura, análisis estático).
7. **Actualización en Jira:** se movía la tarea a "Done" y se actualizaban los campos de horas trabajadas.

### 1.6 *Sprint Review* y *Retrospective*

Al finalizar cada *sprint* se realizaban dos ceremonias:

***Sprint Review*:**
- Se presentaba el incremento funcional al propietario del negocio (*stakeholder* real).
- Se demostraban las nuevas funcionalidades con el entorno de desarrollo.
- Se recogía *feedback* para el *backlog* del siguiente *sprint*.
- Se actualizaba la documentación del producto (manual de usuario, API docs).

***Sprint Retrospective*:**
- Se analizaba qué había funcionado bien, qué podría mejorarse y qué acciones concretas tomar.
- Se revisaban las métricas del *sprint*: velocidad real vs. estimada, historias completadas, deuda técnica acumulada.
- Se identificaban riesgos nuevos o cambios en los existentes.
- Se actualizaba el plan de mitigación de riesgos.

### 1.7 Seguimiento con Jira

Se utilizó Jira Software como herramienta de gestión de proyectos con la siguiente configuración:

- **Proyecto:** "Lembas POS + E-commerce" con clave LEMBAS.
- **Tipos de incidencia:** *Epic* (para temas transversales), *Story* (historias de usuario), *Task* (sub-tareas técnicas) y *Bug*.
- **Campos personalizados:** puntos de historia, horas estimadas, horas trabajadas, *sprint*, módulo arquitectónico (*backend*/*frontend*/infra).
- **Flujo de trabajo:** To Do -> In Progress -> In Review -> Done, con validaciones automáticas mediante reglas de automatización.
- **Tablero Scrum:** configurado con *backlog* priorizado por orden de negocio y *sprints* con capacidad definida.
- ***Epics*:** EP-00 (Infraestructura), EP-01 (Autenticación), EP-02 (Catálogo), EP-03 (Tienda pública), EP-04 (Pagos *online*), EP-05 (Inventario), EP-06 (Órdenes), EP-07 (Caja), EP-08 (POS), EP-09 (Pagos *unified*), EP-10 (Proveedores), EP-11 (Reportes), EP-12 (Usuarios internos).
- **Reportes utilizados:** *burndown chart*, velocidad del equipo, cuadro de mando de *sprints*.

---

## 2. Proceso de Ingeniería

### 2.1 Desarrollo guiado por pruebas (TDD)

Se aplicó TDD de forma selectiva, concentrándose en la lógica de dominio donde la corrección es crítica:

- **Política FEFO:** la lógica de ordenamiento de lotes por fecha de vencimiento se desarrolló con TDD, probando casos con fechas mixtas, valores nulos y lotes con la misma fecha.
- **Cálculo de cierre de caja:** la clase `CashCloseCalculator` se desarrolló con TDD, verificando el cálculo de efectivo esperado a partir de pagos y movimientos CASH.
- **Máquina de estados de órdenes:** las transiciones permitidas de `OrderStatus` se modelaron como pruebas primero, luego se implementó la validación.
- **Cálculo de margen y redondeo de precios:** la lógica de *pricing* se desarrolló con TDD para garantizar precisión en importes monetarios.
- **Validación de *webhooks*:** la verificación de firma HMAC-SHA256 se desarrolló con TDD, incluyendo casos de comparación en tiempo constante para evitar *timing attacks*.

Para el resto del código (controladores, repositorios, configuración), se aplicó un enfoque de "pruebas primero cuando el diseño es incierto, pruebas después cuando el diseño es conocido", manteniendo siempre la cobertura dentro de los umbrales establecidos.

### 2.2 Integración continua

Dada la naturaleza local del proyecto (un único desarrollador trabajando en una máquina), la integración continua se implementó como un *pipeline* de verificación local reproducible antes de cada integración a `main`:

1. **Backend:**
   - Compilación con Maven (`./mvnw clean verify`)
   - Ejecución de todas las pruebas (920 *tests*)
   - Análisis de cobertura con JaCoCo
   - Análisis estático con SpotBugs
   - Verificación de arquitectura con ArchUnit
   - Validación de estilo con Spotless
   - Empaquetado JAR

2. **Frontend:**
   - Instalación limpia (`npm ci`)
   - Verificación de *boundaries* entre módulos
   - Formateo con Prettier
   - *Linting* con ESLint (cero *warnings*)
   - TypeScript *typecheck*
   - Ejecución de todas las pruebas (986 *tests*)
   - Medición de cobertura
   - *Build* de producción
   - Auditoría de dependencias de producción

3. **Infraestructura:**
   - Validación de configuración de Docker Compose
   - *Build* de imágenes *backend* y *frontend*
   - Verificación de migraciones Flyway inmutables

### 2.3 Revisión de código

El proceso de revisión de código se implementó en múltiples capas, reemplazando la revisión por pares (imposible en un equipo unipersonal) por herramientas automatizadas y auditoría diferida:

1. **ArchUnit:** verificación automatizada de la arquitectura del monolito modular. Se definieron reglas que:
   - Prohíben el acceso directo a repositorios de otros módulos.
   - Prohíben el acceso a repositorios desde controladores.
   - Prohíben la inyección de campos (*field injection*).
   - Exigen que las dependencias entre módulos pasen por contratos `api/`.
   - Verifican que los controladores devuelvan DTOs, no entidades JPA.

2. ***Linters*:** ESLint con `angular-eslint` y `typescript-eslint` en el *frontend*; Spotless con formato consistente en el *backend*.

3. **Análisis estático:** SpotBugs para detección de patrones defectuosos en *bytecode* Java.

4. **Validación de *boundaries* *frontend*:** un script personalizado (`scripts/check-feature-boundaries.mjs`) rechaza *imports* profundos entre módulos *frontend* que no pasen por los archivos `public-api.ts`.

5. **Auditoría de dependencias:** `npm audit` con tolerancia cero para dependencias de producción.

### 2.4 Flujo de trabajo Git

Se siguió un flujo de trabajo basado en ramas de *feature* con las siguientes convenciones:

**Estrategia de ramas:**
- `main`: rama principal, siempre en estado desplegable.
- `feat/LEMBAS-nnn-descripción`: ramas de *feature*, creadas desde `main`.
- `fix/LEMBAS-nnn-descripción`: ramas de corrección.
- `refactor/descripción`: ramas de refactorización estructural.

***Conventional Commits*:**
```
feat: implementar deducción FEFO con bloqueo pesimista
fix: corregir cálculo de efectivo esperado en cierre de caja
docs: documentar flujo de integración con Mercado Pago
refactor: extraer contrato de inventario a módulo api
test: agregar cobertura de concurrencia para webhooks
chore: actualizar versión de Testcontainers a 2.0.5
```

**Políticas:**
- No se permite *commit* directo a `main` (salvo el desarrollador en configuración local).
- Cada *commit* debe compilar y pasar pruebas del módulo afectado.
- Antes de integrar a `main`, se ejecuta el *pipeline* completo de verificación.
- Los mensajes de *commit* deben explicar el "qué" y el "por qué", no el "cómo".
- No se permite trabajar con secretos reales en el repositorio.

---

## 3. Estrategia de Calidad

### 3.1 Pirámide de pruebas

Se implementó una estrategia de pruebas basada en la pirámide clásica, adaptada al contexto de un monolito modular:

**Nivel 1 -- Pruebas unitarias (base de la pirámide):**
- Prueban clases individuales (servicios, *mappers*, validadores, políticas de dominio) con dependencias simuladas mediante *mocking*.
- *Framework*: JUnit 5 + Mockito para *backend*; Vitest para *frontend*.
- Cobertura objetivo: 75% *statements*, 74% *branches*, 55% *functions*, 78% *lines*.
- Ejecución: en cada compilación, sin necesidad de infraestructura externa.

**Nivel 2 -- Pruebas de integración:**
- Prueban la interacción entre capas: servicio + repositorio + base de datos real.
- Utilizan Testcontainers con PostgreSQL 16 real para garantizar fidelidad con el entorno de producción.
- Cubren *constraints* de base de datos, migraciones Flyway, lógica de persistencia y consultas JPQL/SQL nativas.
- *Framework*: Spring Boot Test + Testcontainers 2.0.5 + `@DataJpaTest` y `@SpringBootTest`.

**Nivel 3 -- Pruebas de controlador (*WebMvcTest*):**
- Prueban los controladores REST con la capa *web* real y servicios simulados.
- Verifican códigos HTTP, estructura de respuestas, validación de DTOs de entrada, serialización/deserialización JSON y manejo de errores.
- *Framework*: `@WebMvcTest` + Mockito + `MockMvc`.

**Nivel 4 -- Pruebas de integración de extremo a extremo (E2E):**
- Prueban flujos completos que atraviesan múltiples módulos: autenticación real JWT, operaciones HTTP completas, base de datos real con Testcontainers.
- Cubren los flujos críticos del negocio: registro -> *login* -> catálogo -> carrito -> orden -> pago (simulado) -> confirmación.
- *Framework*: `@SpringBootTest` + Testcontainers + `TestRestTemplate`.

### 3.2 Umbrales de cobertura

Los umbrales de cobertura se definieron en función de los reportes de JaCoCo (*backend*) y la configuración de Vitest (*frontend*):

| Métrica | *Backend* (JaCoCo) | *Frontend* (Vitest) |
|---------|-------------------|---------------------|
| *Statements* | 75% | 75% |
| *Branches* | 74% | 74% |
| *Functions* | 55% | 55% |
| *Lines* | 78% | 78% |

Estos umbrales se verifican en cada *build* completo y constituyen un criterio de calidad obligatorio. Si no se alcanzan, el *build* falla.

### 3.3 Herramientas de análisis estático

**SpotBugs 4.9.8.2 (*backend*):**
- Análisis de *bytecode* Java para detectar patrones defectuosos: *null pointer dereference*, recursos no cerrados, comparaciones incorrectas, problemas de concurrencia.
- Integrado en el ciclo de vida de Maven mediante `spotbugs-maven-plugin`.
- Configurado con nivel de esfuerzo "máximo" y filtro de exclusiones para casos justificados.

**JaCoCo 0.8.13 (*backend*):**
- Medición de cobertura de pruebas a nivel de *bytecode*.
- Genera reportes HTML, XML y CSV.
- Integrado con verificación de umbrales en el perfil `verify`.

**ESLint 10.7.0 + angular-eslint 21.4.0 (*frontend*):**
- Análisis estático de TypeScript y HTML en componentes Angular.
- Configuración con tolerancia cero a *warnings*.
- Reglas de *accessibility*, *best practices*, *type checking* y estilo de código.

**Prettier 3.8.1 (*frontend*):**
- Formateo automático de código TypeScript, HTML, CSS y JSON.
- Verificado en CI mediante `prettier --check`.
- Sin configuración personalizada (valores por defecto del formateador).

**Spotless 2.44.5 (*backend*):**
- Formateo y verificación de estilo de código Java.
- Integrado con Maven mediante `spotless-maven-plugin`.

### 3.4 Pruebas de arquitectura con ArchUnit

Se implementaron pruebas de arquitectura utilizando ArchUnit 1.4.1 para verificar automáticamente las reglas estructurales del monolito modular:

- **Reglas de dependencia entre módulos:** ningún módulo puede acceder directamente al repositorio de otro módulo; debe utilizar el contrato publicado en el paquete `api/`.
- **Reglas de capas:** los controladores no pueden acceder a repositorios; los servicios no pueden exponer entidades JPA.
- **Reglas de inyección:** prohibido el uso de `@Autowired` en campos; solo se permite inyección por constructor.
- **Reglas de nomenclatura:** los paquetes deben seguir la convención `com.dietetica.lembas.{módulo}`.
- **Reglas de excepciones:** las únicas excepciones permitidas son `SecurityConfig -> JwtAuthenticationFilter` (*wiring* de infraestructura).

Estas reglas se ejecutan como parte de la suite de pruebas y garantizan que la arquitectura se mantenga limpia ante cualquier cambio.

### 3.5 Verificación de *boundaries* *frontend*

Se desarrolló un script personalizado (`scripts/check-feature-boundaries.mjs`) que:

1. Escanea todos los *imports* TypeScript en los módulos de funcionalidad (`features/`).
2. Identifica *imports* que cruzan a otro módulo de funcionalidad sin pasar por su `public-api.ts`.
3. Rechaza el *build* si se encuentra alguna violación.
4. Se ejecuta como parte del comando `npm run boundaries` y del *pipeline* `npm run verify`.

Este mecanismo es el equivalente *frontend* de ArchUnit para el *backend*, asegurando que los módulos *frontend* mantengan sus límites de responsabilidad.

---

## 4. Declaración sobre el Uso de Asistentes de Inteligencia Artificial

### 4.1 Alcance del uso de IA

Durante el desarrollo de este proyecto, se utilizaron asistentes de inteligencia artificial (agentes de código) como herramientas de productividad bajo supervisión humana constante. Este uso se enmarcó en la metodología definida en el documento `AGENTS.md` del proyecto y se registró en `docs/ai-usage-log.md`.

### 4.2 Áreas de aplicación

La IA se utilizó en las siguientes áreas:

1. **Generación de código:** implementación de DTOs, *mappers*, controladores CRUD, configuración de Spring Security, pruebas unitarias y de integración, componentes Angular con *signals*, y servicios *frontend*.

2. **Documentación técnica:** redacción de documentos de arquitectura, documentación de API, guías de desarrollo, flujos de proceso y la presente documentación académica.

3. **Refactorización:** extracción de contratos de módulo, migración de dependencias entre módulos, eliminación de código duplicado y aplicación de patrones de diseño.

4. **Pruebas:** generación de casos de prueba para cobertura de límites, pruebas de concurrencia y verificación de invariantes de dominio.

### 4.3 Principios aplicados

Todo el código generado por IA fue sometido a los mismos controles de calidad que el código escrito manualmente:

- **Revisión humana:** cada fragmento de código generado fue revisado, comprendido y validado por el desarrollador antes de ser integrado.
- **Ejecución de pruebas:** todo el código generado debió pasar la suite completa de pruebas del proyecto.
- **Análisis estático:** el código generado fue verificado por SpotBugs, ESLint, ArchUnit y las herramientas de formateo.
- **Validación de arquitectura:** se verificó que no introdujera violaciones a las reglas de dependencia entre módulos.
- **Sin secretos ni configuraciones sensibles:** la IA no tuvo acceso ni generó secretos reales, claves de API, tokens de producción ni configuraciones de seguridad para entornos productivos.

### 4.4 Limitaciones y exclusiones

La inteligencia artificial **no** fue utilizada para:

- Decisiones de diseño arquitectónico fundamentales (elección de monolito modular vs. microservicios, modelo *unified* de órdenes, política FEFO).
- Configuración de seguridad sensible (JWT *signing keys*, secretos de Mercado Pago, configuración HTTPS).
- Decisiones de negocio (definición de políticas de cancelación, plazos de retiro, términos y condiciones legales).
- Redacción de documentos legales o contractuales.

### 4.5 Justificación

El uso de asistentes de IA en este proyecto académico se justifica por las siguientes razones:

- **Productividad:** permitió al desarrollador mantener el ritmo de 75 puntos de historia por *sprint* en un proyecto complejo con múltiples módulos y tecnologías.
- **Calidad:** los asistentes facilitaron la generación de pruebas exhaustivas y documentación detallada, elevando la calidad general del producto.
- **Aprendizaje:** el proceso de revisión y corrección del código generado por IA constituyó una experiencia de aprendizaje activo, similar a la revisión de código por pares en entornos profesionales.
- **Transparencia:** el registro detallado en `docs/ai-usage-log.md` permite rastrear exactamente qué partes del sistema fueron asistidas por IA y en qué medida.

---

## 5. Herramientas y Versiones

### 5.1 *Backend*

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Java | 21 (LTS) | Lenguaje de programación principal |
| Spring Boot | 3.5.0 | *Framework* de aplicaciones |
| Maven | 3.9+ (*wrapper*) | Gestión de dependencias y *build* |
| Spring Data JPA | 3.5.0 (vía Boot) | Persistencia y repositorios |
| Spring Security | 3.5.0 (vía Boot) | Autenticación y autorización |
| Spring Validation | 3.5.0 (vía Boot) | Validación de DTOs |
| PostgreSQL | 16 | Base de datos relacional |
| Flyway | 10.x (vía Boot) | Migraciones de base de datos |
| Hibernate | 6.x (vía Boot) | ORM |
| Testcontainers | 2.0.5 | Contenedores para *tests* de integración |
| ArchUnit | 1.4.1 | Pruebas de arquitectura |
| SpotBugs | 4.9.8.2 | Análisis estático de *bytecode* |
| JaCoCo | 0.8.13 | Cobertura de pruebas |
| Spotless | 2.44.5 | Formateo de código |
| Maven Enforcer | 3.5.0 | Restricciones de dependencias |
| OpenPDF | 1.x | Generación de PDFs (órdenes de compra) |
| Commons CSV | 1.x | Procesamiento de archivos CSV |
| JJWT | 0.12.x | Creación y validación de tokens JWT |
| Mercado Pago SDK | 1.x | Integración con Mercado Pago |
| SpringDoc OpenAPI | 2.x | Documentación de API (Swagger) |

### 5.2 *Frontend*

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Node.js | 22.14 | Entorno de ejecución |
| npm | 11.14.1 | Gestión de paquetes |
| Angular | 21.2.18 | *Framework* de desarrollo web |
| Angular CLI | 21.2.18 | Herramientas de línea de comandos |
| TypeScript | 5.9.2 | Lenguaje de programación |
| PrimeNG | 21.1.7 | Biblioteca de componentes UI |
| PrimeIcons | 7.x | Iconografía |
| Tailwind CSS | 4.3.0 | *Framework* de estilos utilitario |
| Vitest | 4.0.8 | *Framework* de pruebas unitarias |
| jsdom | 28.0.0 | Entorno DOM para pruebas |
| ESLint | 10.7.0 | Análisis estático de código |
| angular-eslint | 21.4.0 | *Plugin* ESLint para Angular |
| Prettier | 3.8.1 | Formateo automático |
| typescript-eslint | 8.64.0 | Reglas TypeScript para ESLint |

### 5.3 Infraestructura

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Docker | 24+ | Contenedores |
| Docker Compose | 2.x | Orquestación de contenedores |
| Nginx | 1.27+ | Servidor *web* y *proxy* inverso |
| ngrok | 3.x | Túnel para *webhooks* de desarrollo (opcional) |

### 5.4 Gestión de proyectos

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Jira Software | Nube | Gestión de proyecto y *sprint tracking* |
| Git | 2.x | Control de versiones |
| GitHub | - | Repositorio remoto |

---

## Referencias

Las referencias completas del proyecto se encuentran en el documento `bibliography.md` dentro de este mismo directorio académico.

---

*Documento generado como parte de la documentación académica del proyecto final "Sistema de Gestión Comercial Integrada con Comercio Electrónico para Dietética Lembas".*
