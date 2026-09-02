# Spec: Dashboard Angular (tarea 10)

**Estado:** ❌ Pendiente de briefing aprobado por Jorge (bloqueada por compromiso de proceso del 31/08/2026)  
**Fecha:** 02/09/2026  
**Relacionado:** [spec de producto](producto.md) · [ADR-006](adr/ADR-006-mongodb-atlas-bad-auth.md) (sistema de diseño) · [viability-engine](viability-engine.md) (KPIs motor)  

---

## 1. Contexto y motivación
El Dashboard es la capa de presentación que permite a los usuarios de la promotora visualizar el estado de sus promociones, tomar decisiones operativas y consultar al asistente de IA. Depende de la tarea 7 (persistencia MongoDB y endpoints `/promotions` y `/promotions/:id/viability`) para obtener los datos necesarios y se integra con la tarea 9 (orquestador + agentes) mediante el widget de chat AI que aprovecha el mismo contexto de sesión. Resuelve el problema de tener información fragmentada en hojas de cálculo al proporcionar una vista única, actualizada y accionable de las promociones de la empresa.

## 2. Objetivos del MVP y NO-objetivos (YAGNI explícito)

### Objetivos del MVP
- Mostrar una visión general de KPIs del motor de viabilidad para todas las promociones de la empresa activa.
- Listar promociones en una tabla con filtros y ordenación, mostrando columnas relevantes (nombre, estado, margen bruto %, pre‑ventas %, velocidad, meses a venta total, viabilidad).
- Permitir navegar al detalle de una promoción específica, mostrando sus KPIs y datos de entrada.
- Proveer un widget de chat AI de pantalla completa que responda a preguntas predefinidas sobre rentabilidad, explicaciones de estado, comparación y resumen ejecutivo, con streaming visible, citas de fuentes y memoria de sesión.
- Aplicar RBAC sobre Clerk (admin, analyst, viewer, agent) para controlar el acceso a vistas y acciones.
- Permitir a los roles admin editar los umbrales de margen y pre‑ventas utilizados por el motor.
- Arrancar en modo fixture (`useFixtureApi:true`) y cambiar a modo real con un único cambio de flag cuando la persistencia Atlas esté verificada.
- Cumplir la paleta, tipografía y componentes definidos en ADR‑006 (sin glassmorphism, sin gradientes decorativos).
- Garantizar accesibilidad WCAG AA, navegación teclado y respeto a prefers‑reduced‑motion.

### NO‑objetivos (YAGNI)
- Persistencia de preferencias de usuario fuera de la sesión (tema, filtros guardados, layout personalizado).
- Exportación de informes a PDF/CSV.
- Soporte multi‑empresa simultánea en la misma vista (el dashboard está acoplado a la `company_id` del token Clerk).
- Integración directa con el orquestador de tareas 8/9 más allá del widget de chat.
- Cálculos de viabilidad en el frontend (todos los KPIs provienen del endpoint `/promotions/:id/viability`).
- Modo oscuro o temas alternativos.
- Animaciones complejas más allá de transiciones básicas y skeletons de loading.
- Internacionalización (i18n) más allá del español.
- Pruebas de carga o pruebas de rendimiento excesivas más allá de los presupuestos declarados.

## 3. Usuarios y permisos (RBAC tabla)

| Rol en Clerk | Permisos en Dashboard | Comentario |
|--------------|-----------------------|------------|
| admin        | Lectura completa de todas las promociones, edición de umbrales de margen y pre‑ventas, acceso a todos los KPIs y al chat AI. | Puede configurar el comportamiento del motor de viabilidad. |
| analyst      | Lectura completa de todas las promociones, acceso a KPIs y chat AI. No puede editar umbrales. | Rol operativo de análisis. |
| viewer       | Lectura completa de todas las promociones, acceso al chat AI. | Rol de consulta solo lectura. |
| agent        | Lectura solo de las promociones asociadas a su `company_id` (si aplica multi‑tenant futuro) o a su usuario asignado, acceso al chat AI limitado a sus promociones. | Rol de agente comercial con visión restringida. |

Nota: actualmente el proyecto es mono‑tenant (única empresa `kavana_viability_executive`), por lo que los roles admin, analyst y viewer tienen el mismo alcance de datos; el rol agent se reserva para futuras extensiones.

## 4. Vistas y composición (Monitor surface primario, NO hero+cards)

El dashboard sigue un modelo de una sola página con navegación lateral colapsable. La superficie principal muestra una de las cuatro vistas según la ruta. No se usa un hero con cards promocionales; en su lugar, la vista Overview actúa como monitor de alto nivel.

### 4.1 Overview
- **Propósito:** ofrecer un resumen ejecutivo de la cartera de promociones.
- **Componentes:**
  - Barra de filtros global (empresa, estado, rango fechas, ciudad/zona, comercial, umbral margen) que afecta a todas las vistas.
  - Cuatro tarjetas de KPI resumidos (ingresos esperados total, margen bruto medio ponderado, pre‑ventas medio ponderado, velocidad media uds/mes). Cada tarjeta muestra valor, variación respecto al periodo anterior (opcional en MVP) y estado (verde/ámbar/rojo) según umbrales configurables.
  - Gráfico de barras apiladas sencillo (opcional en post‑MVP) que muestra unidades totales vs vendidas por promoción (solo si se dispone del dato `unitsSold` en el fixture).
  - Lista de promociones con estado crítico (rojo) que requieren acción, enlazando directamente al detalle.
- **Datos:** se obtiene llamando a `GET /promotions` (con filtros aplicados como query params) y, para cada promoción, el endpoint `/promotions/:id/viability` puede ser llamado en lote o individualmente; en MVP se acepta llamar al endpoint de viabilidad por cada fila visible (máximo 20 filas por página) y mostrar un skeleton mientras se carga.
- **Nota de honestidad:** los KPIs de la cartera son agregaciones simples (suma o promedio ponderado) de los resultados del motor; no se inventan métricas nuevas.

### 4.2 Promotions (tabla)
- **Propósito:** permitir inspección detallada y acciones masivas sobre la lista de promociones.
- **Componentes:**
  - Tabla con paginación (side‑server, página tamaño 10/25/50/100).
  - Columnas: Nombre, Estado (enum: estudio, aprobado, en construcción, entregado, pausado), Ingresos esperados (€), Margen bruto (€ y %), Pre‑ventas (%), Velocidad (uds/mes), Meses a venta total, Viabilidad (bool, con color verde/ámbar/rojo), Acciones (ícono de detalle).
  - La columna Viabilidad se calcula comparando el margen bruto % y el pre‑ventas % contra los umbrales configurables (verde si margen ≥ umbralVerde Y pre‑ventas ≥ umbralPreVentasVerde; ámbar si cumple uno de los dos rangos intermedios; rojo en caso contrario). Los umbrales provienen del endpoint de configuración (solo admin) o del fixture.
  - Filtros de columna (texto para Nombre, select para Estado, rango para fechas y números) y ordenación por cualquier columna (toggle ascendente/descendente).
  - Acciones masivas (opcional en post‑MVP): cambio de estado, exportar selección.
- **Datos:** misma llamada a `GET /promotions` con parámetros de filtro, paginación y ordenación. Cada fila dispara una llamada a `/promotions/:id/viability` para obtener los KPIs; se utiliza `trackBy` para evitar rellamados innecesarios.

### 4.3 Promotion detail
- **Propósito:** mostrar todos los datos de una promoción y su desglose de viabilidad.
- **Layout:** dos columnas (izquierda: resumen y KPIs grandes; derecha: pestañas con tablas de detalle).
- **Contenido:**
  - Encabezado con nombre, ID, estado y badge de viabilidad (color).
  - Sección de KPIs grandes (6 tarjetas): ingresos esperados, margen bruto €, margen bruto %, pre‑ventas %, coste por unidad, coste por m2, precio medio m2, velocidad uds/mes, meses a venta total, consistencia de unidades (bool).
  - Pestaña "Datos de entrada": muestra las unidades tipológicas, financials (suelo, construcción, presupuesto total, ingresos comprometidos), fechas y unidades vendidas (si existen).
  - Pestaña "Historial de runs" (opcional en post‑MVP): lista de ejecuciones del motor con su timestamp y resultado.
  - Botón "Recalcular" (solo admin/analyst) que vuelve a llamar al endpoint `/promotions/:id/viability` forzando refresh.
- **Datos:** se carga llamando a `GET /promotions/:id` (datos estáticos) y `GET /promotions/:id/viability` (KPIs). Si el detalle se abre desde la tabla, se pueden reutilizar los KPIs ya cargados.

### 4.4 AI Chat
- **Propósito:** proporcionar un asistente conversacional que ayude a interpretar los datos y sugerir acciones.
- **Modo:** takeover de pantalla completa (oculta el sidebar y la barra superior al abrirse, con botón de cierre en esquina superior derecha).
- **Entrada:** caja de texto con sugerencias de preguntas predefinidas (ver sección 9). Envío con Enter o botón de enviar.
- **Salida:** mensaje del asistente en burbuja, con:
  - Texto de respuesta.
  - Chips interactivos que representan promociones mencionadas (clic lleva al detalle).
  - Enlaces internos a la vista de detalle de la promoción correspondiente.
  - Indicador de streaming visible (cursor parpadeante o barra de progreso) mientras se genera la respuesta.
  - Citaciones en línea (número entre corchetes) que enlazan a una sección de fuentes colapsable al final del mensaje.
- **Memoria:** solo dentro de la sesión de navegador (almacenamiento en variable de servicio, no persiste en recarga ni cross‑session).
- **Fuentes:** el motor de IA (tarea 9) debe devolver además del texto una lista de fuentes utilizadas (por ejemplo, fragmentos del conocimiento corporativo, resultados del motor de viabilidad para promociones específicas). En MVP se asume que el orquestador responde con ese formato.
- **Preguntas soportadas (ver sección 9).**
- **Accesibilidad:** foco inicial en la caja de entrada, navegación con ARIA‑live region para anuncios de nuevo mensaje, escape para cerrar.

## 5. Sistema de diseño
Se refiere exclusivamente al ADR‑006 (no duplicar tokens aquí). Los colores, tipografía, pesos, radio de bordes, sombras y estados (hover, active, disabled) se toman de ese documento. En particular:
- Fondo de página: #F7F6F2.
- Card: fondo #FFFFFF, borde 1px solid rgba(15,42,74,0.08).
- CTA principal: fondo #0F2A4A, texto #FFFFFF, hover #1A3F6B.
- Acento IA: #2563EB.
- Estados: verde #0F766E, ámbar #B45309, rojo #B91C1C.
- Texto primario: #0F2A4A, secundario: #475569.
- Tipografía: Inter variable, pesos 400/500/600/700, uso de tablas numéricas en KPIs.
Se prohíbe el uso de glassmorphism, gradientes decorativos o sombras pesadas.

## 6. Datos y APIs consumidos
| Endpoint | Método | Descripción | Transformaciones en frontend |
|----------|--------|-------------|------------------------------|
| `GET /promotions` | GET | Lista ligera de promociones (id, nombre, estado, startDate, etc.). Se usa para poblar la tabla y el overview. | Aplicar filtros y paginación recibidos como query params (`?companyId=...&state=...&dateFrom=...&dateTo=...&city=...&comercial=...&marginThreshold=...`). |
| `GET /promotions/:id/viability` | GET | Ejecuta el motor de viabilidad sobre la promoción y devuelve el objeto `ViabilityResult` (ver viability-engine.md). | Mapear directamente a los KPIs de la UI. Si falta algún campo (p.ej. `unitsSold`), mostrar `null` o `--`. |
| `GET /promotions/:id` | GET | Datos estáticos de la promoción (tipologías, financials, etc.). Usado en la vista de detalle. | Mostrar tal cual en las pestañas de datos de entrada. |
| `POST /viability/umbrales` *(solo admin)* | POST | Actualiza los umbrales de margen y pre‑ventas usados por el motor. Endpoint a crear en tarea 7 si no existe. | En el panel de configuración (solo visible para admin), leer umbrales actuales vía `GET /viability/umbrales` y permitir edición; al guardar, llamar a este POST. |
| `GET /viability/umbrales` *(solo admin)* | GET | Recupera los umbrales actuales configurados en el sistema. | Precargar el formulario de edición de umbrales. |

> **Nota de honestidad:** no se inventan nuevos endpoints más allá de los mencionados. Si el endpoint de umbrales aún no existe, se marca explícitamente como “endpoint a crear en tarea 7”. En el MVP se pueden leer los umbrales desde el fixture (`fixtures/companies/kavana-viability-executive/conocimiento_corporativo.md`) mientras se verifica la persistencia real.

## 7. Estados de UI (loading skeleton, empty, error, success) y cómo se manejan
- **Loading skeleton:** mientras se espera la respuesta de cualquier llamada GET, se muestra un esqueleto animado (líneas de ancho variable) que imita la disposición final (tarjetas, filas de tabla, etc.). Se utiliza la primitive de Angular CDK o una implementación sencilla con `opacity: 0.5` y animación de gradiente.
- **Estado empty:** cuando la lista de promociones resulta vacía tras aplicar filtros, se muestra una ilustración o mensaje “No se encontraron promociones con los filtros aplicados” con botón para limpiar filtros.
- **Estado error:** si alguna llamada falla (timeout, error de red, respuesta 5xx), se muestra un banner de error en la parte superior de la vista afectada con mensaje genérico (“Error al cargar los datos. Por favor, inténtalo de nuevo.”) y botón de reintentar. Los errores 401/403 redirigen al login de Clerk.
- **Estado success:** datos recibidos y renderizados normalmente. En la tabla, cada fila muestra los valores reales; en el overview, los KPIs muestran sus valores y el indicador de estado (verde/ámbar/rojo) según umbrales.
- **Especial chat:** mientras se transmite la respuesta del AI, se muestra un indicador de streaming (puntos animados o barra) en la burbuja del asistente; si falla, se muestra mensaje de error y opción de reintentar la última pregunta.

## 8. Filtros y ordenación (tabla con comportamiento exacto)
Los filtros se aplican como query params al endpoint `/promotions`. Se mantienen en la URL para permitir compartir enlaces y recargar con el mismo estado.
- **Empresa:** select de `companyId` (actualmente solo `kavana_viability_executive`). No afecta si es mono‑tenant.
- **Estado:** multiple select con los valores posibles del campo `state` en la promoción (estudio, aprobado, en construcción, entregado, pausado).
- **Rango fechas:** dos campos de date picker (startDate y/o fecha de corte) que filtran promociones cuyo `startDate` esté dentro del rango.
- **Ciudad/zona:** texto libre que se compara contra la ubicación de la promoción (se asume que el fixture o la BD tiene un campo `city` o similar; si no existe, el filtro se ignora con advertencia en consola).
- **Comercial:** texto libre que filtra por nombre de comercial (campo `comercial` en la promoción, si existe).
- **Umbral margen:** número que representa el porcentaje mínimo de margen bruto para considerar una promoción como “verde” en la tabla; se usa para colorear la fila completa (verde si margen ≥ umbral Y pre‑ventas ≥ umbralPreVentas; ámbar/rojo según lógica de sección 4.2). Este filtro no reduce la lista, solo cambia la presentación de estado.
Ordenación:
- Cualquier columna puede ser ordenada haciendo clic en el encabezado; el primer clic ordena ascendente, el segundo descendente, el tercero elimina el orden.
- Se indica la dirección con un ícono de flecha arriba/abajo.
- El orden se envía como `_sort` y `_order` (convención JSON Server) o como `sortBy=campo,dir` según lo que acepte el backend; en MVP se asume que el endpoint `/promotions` soporta los parámetros `_sort` y `_order`.
- Cuando se aplica ordenación, se reinicia la página a 1.

## 9. Chat AI: preguntas soportadas, formato de salida, fuentes, memoria
El widget de chat acepta las siguientes preguntas (y variaciones semánticas equivalentes). El motor de IA (tarea 9) debe reconocer la intención y responder según el formato descrito.
- “¿cuál es la más rentable?” → responde con la promoción que tiene mayor margen bruto % (o mayor margen bruto € si se especifica). Incluye chip con su ID y enlace al detalle.
- “explícame por qué X está rojo” → donde X es el ID o nombre de una promoción. Explica qué umbrales no cumple (margen bajo, pre‑ventas bajas o ambos) y muestra los valores actuales frente a los umbrales configurables.
- “compara A vs B vs C” → donde A, B, C son IDs o nombres. Muestra una tabla comparativa de los KPIs principales (ingresos esperados, margen bruto %, pre‑ventas %, velocidad) y destaca cuál es la mejor en cada métrica.
- “resumen ejecutivo de X” → donde X es ID o nombre. Da un párrafo de 3‑4 frases con los KPIs más relevantes, su viabilidad y una recomendación breve (ej. “Revisar estrategia de precios” o “Promoción viable, considerar aceleración de ventas”).
- “¿qué promociones necesitan acción?” → lista las promociones que están en estado rojo (según umbrales actuales) y, opcionalmente, aquellas en ámbar que están cerca de pasar a rojo. Incluye chips con cada promoción y enlace al detalle.
Formato de salida:
- Texto plano con soporte básico de markdown (negrita, listas).
- Chips: se representan como `[Promoción: La Marina (ID: prom_001)]` que al renderizar se convierte en un componente clickeable que navega a `/promotions/prom_001/detail`.
- Enlaces internos: se usan rutas relativas de Angular.
- Fuentes: al final del mensaje, bloque colapsable “Fuentes” con viñetas que citan el documento o dato usado (ej. “[1] conocimiento_corporativo.md: margen bruto objetivo 18‑22%”, “[2] viability-engine output for prom_001: margenBrutoPct=12,4”).
Memoria de sesión:
- El servicio de chat guarda el último N turnos (configurable, default 5) en una variable de comportamiento (Subject) para que el modelo tenga contexto de la conversación actual.
- Al recargar la página, el historial se pierde (no se usa localStorage ni IndexedDB).
- No se envían datos de sesión al backend; todo el estado queda en el frontend.

## 10. Configuración por usuario (umbrales de margen/pre‑ventas editables por admin)
Los umbrales que determinan los colores verde/ámbar/rojo son configurables por usuarios con rol admin mediante un panel de acceso desde el sidebar (ícono de engranaje). El panel muestra:
- Umbral de margen bruto mínimo para verde (por defecto 18%).
- Umbral de pre‑ventas mínimo para verde (por defecto 30%).
- Rangos intermedios para ámbar: margen entre 12% y 18% **O** pre‑ventas entre 15% y 30% (los valores se calculan automáticamente a partir de los verdes; no se editan directamente).
Al cambiar cualquiera de los valores verdes y guardar:
- Se llama a `POST /viability/umbrales` con el nuevo objeto `{ marginVerdePct: number, preVentasVerdePct: number }`.
- En caso de éxito, se actualiza el store global de umbrales y se vuelve a calcular el estado de todas las promociones visibles (sin necesidad de recargar la página).
- Se muestra un toast de confirmación.
- En caso de error, se muestra mensaje y se revierte el cambio en el UI.
Los umbrales se persisten en la base de datos (tarea 7) y se leen al iniciar la aplicación mediante `GET /viability/umbrales`. Si el endpoint no está disponible (modo fixture), se leen del fixture `conocimiento_corporativo.md`.

## 11. Accesibilidad (WCAG AA, keyboard, focus, prefers-reduced-motion)
- WCAG AA: contraste de texto contra fondo verificado con la paleta de ADR‑006 (todos los pares pasan AA para texto grande y normal). Los componentes de botón y enlace tienen foco visible (contorno 2px solid #0F2A4A).
- Keyboard: toda la funcionalidad es navegable con Tab/Shift+Tab. Los diálogos (chat, detalle) traman el foco dentro de su contorno y lo devuelven al elemento que los abrió al cerrar. Los filtros de tabla y los selects son operables mediante teclado.
- Focus: los elementos interactivos tienen indicador de foco claro; se evita outline:none.
- Prefers-reduced-motion: se respeta la media query; las animaciones de loading skeleton y transiciones de página se reducen a un simple fade-in/fade-out cuando el usuario indica preferir menos movimiento.
- ARIA: las regiones de carga usan `aria-live="polite"`; el chat usa `aria-live="assertive"` para la burbuja del asistente y `role="log"` para el contenedor de mensajes. Los chips tienen `role="button"` y `tabindex="0"`.
- Tamaño de objetivo táctil: mínimo 44x44px para botones y chips.
- Se evita el uso de color como único medio de información; los estados verde/ámbar/rojo también se acompañan de iconos (check, alert, circle‑exclamation) y texto alternativo en `aria-label`.

## 12. Performance budgets (TTI, LCP, bundle size, hydration)
- **Bundle size:** el bundle inicial de la aplicación Angular (incluyendo lazy‑loaded modules del dashboard) no debe superar los 180 KB gzipped. Se mide con `nx build dashboard --prod --source-map=false`.
- **TTI (Time to Interactive):** < 3.5 segundos en conexiones 3G lenta simulada (condition: Slow 3G) usando Lighthouse en el entorno de pruebas.
- **LCP (Largest Contentful Paint):** < 2.5 segundos bajo las mismas condiciones.
- **Hydration:** dado que es Angular SSR, el tiempo entre el HTML servido y la hidratación completa debe ser < 1 segundo en condiciones normales. Se evita manipulación del DOM en constructors o ngOnInit que dependa de datos asíncronos sin resolver previamente.
- **Lazy loading:** las rutas Overview, Promotions, Promotion detail y AI Chat se cargan de forma diferida mediante `loadChildren` y se precargan únicamente cuando el usuario navega a ellas (preloadingStrategy: PrefetchAll en módulo principal, opcional).
- **Optimización de imágenes:** no se usan imágenes promocionales en el MVP; si se añaden en el futuro, deben estar compradas en WebP y con `loading="lazy"`.
- **Consumo de datos:** se limita el número de filas traídas por página a 20 (configurable) y se evita obtener todos los KPIs de antemano; se solicitan solo para las filas visibles mediante `trackBy` y se cancela la petición previa si cambia el filtro o la página.
- **Uso de CDN:** los assets estáticos se sirven desde el mismo dominio que la aplicación (Vercel) para reducir DNS lookups.

## 13. Plan de verificación (qué tests, qué pruebas manuales, qué se considera “verificado”)
### Tests unitarios
- Servicios: `ApiService` (mockeando llamadas HTTP), `UiStateService` (filtros, paginación, ordenación), `ChatService` (historial, envío de preguntas).
- Componentes: pruebas de renderizado con datos mock (overview cards, tabla con sorter y filter, detalle con pestañas, chat con mensajes y chips).
- Pipes: pipe de formato de número español (punto miles, coma decimal), pipe de estado a color.
### Tests de integración (Cypress o Playwright)
- Flujo completo: login con Clerk (mockeado), navegación a Overview, verificación de KPIs, cambio de filtro, comprobación de que la URL se actualiza y los datos se re‑cargan.
- Tabla: ordenación por cada columna, paginación, filtro de texto y select, verificación de que se llaman los endpoints correctos con los parámetros esperados.
- Detalle: navegación desde la tabla a detalle, comprobación de que se muestran los KPIs y los datos de entrada, botón de recalcular vuelve a llamar al endpoint.
- Chat: envío de una pregunta soportada, verificación de que se muestra respuesta con chip y enlace, cierre con ESC, memoria de sesión (dos preguntas seguidas mantienen contexto).
- RBAC: simular diferentes roles de Clerk (mediante mock del token) y comprobar que los elementos UI aparecen/desaparecen según corresponda (ej. botón de edición de umbrales solo para admin).
### Pruebas manuales (checklist)
- Verificar que la paleta y tipografía coinciden con ADR‑006 (inspección visual).
- Comprobar que los estados de loading, empty y error se muestran adecuadamente al desconectar la red o simular timeouts.
- Probar el cambio de umbrales por parte de un usuario admin y observar que los colores de la tabla se actualizan en tiempo real.
- Probar el acceso como viewer y confirmar que no se puede acceder al panel de configuración.
- Probar el chat con las cinco preguntas soportadas y validar que la respuesta incluye chips y enlaces funcionales.
- Verificar que la aplicación funciona sin JavaScript deshabilitado (SSR muestra al menos el layout básico; no se espera interactividad).
- Comprobar el respeto a prefers‑reduced‑motion en el panel de configuración de accesibilidad del sistema operativo.
### Criterio de verificado
- Todos los tests unitarios y de integración pasan en CI.
- Las pruebas manuales del checklist son aprobadas por al menos un miembro del equipo de QA.
- El bundle size, TTI y LCP están dentro de los presupuestos definidos en sección 12.
- No hay errores en la consola del navegador en las rutas principales.
- El endpoint `/promotions` devuelve las 6 promociones del fixture con los campos esperados y el endpoint `/promotions/:id/viability` devuelve un objeto válido según la interfaz de `viability-engine.md`.

## 14. Riesgos y preguntas abiertas (3‑5 max, concretas)
1. **Dependencia del endpoint de viabilidad:** si el cálculo en el backend es lento (>800ms), la experiencia de tabla y detalle podría verse afectada. ¿Se debería considerar la paginación de KPIs en el backend o un caché a nivel de servicio (NGRX) para evitar rellamados?
2. **Consistencia de datos entre fixture y BD real:** el fixture contiene campos como `unitsSold` y `startDate` que pueden estar ausentes en la promoción real. ¿Cómo debe manejar el frontend la ausencia de estos campos (mostrar `--`, ocultar la fila de velocidad, etc.) sin romper el layout?
3. **Escalabilidad del chat AI:** el historial de sesión se guarda en memoria; si el usuario mantiene la sesión abierta durante horas, el consumo de memoria podría crecer. ¿Se debería implementar un límite de turnos y persistencia opcional en localStorage solo para la sesión actual (borrado al recargar)?
4. **RBAC futuro multi‑tenant:** actualmente el proyecto es mono‑tenant; cuando se añadan múltiples empresas, los filtros de `companyId` y la visión del rol agent deberán revisarse. ¿Se debería diseñar el servicio de promociones para aceptar `companyId` como header obligatorio desde el principio?
5. **Formato de número en pipelines:** el uso de pipes para formato de número español (punto miles, coma decimal) puede impedir el ordenamiento numérico puro en la tabla si se ordena antes de formatear. ¿Se debería ordenar por el valor numérico crudo en el servicio y solo aplicar el pipe en la vista?

---
*Fin de la especificación.*