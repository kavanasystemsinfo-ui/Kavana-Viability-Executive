# ADR-008: Dashboard Angular — Stack, datos y arquitectura

**Estado:** Propuesto (a aprobar por Jorge)  
**Fecha:** 2026-09-02  

## Contexto

La tarea 10 del roadmap consiste en construir el dashboard Angular (promociones, KPIs y chat widget) sobre la base ya establecida: monorepo Nx 23, Angular 22 SSR, NestJS 11 + Clerk, motor de viabilidad puro y persistencia MongoDB con filtrado por `companyId`. Las tareas 4-7 (auth, despliegue, motor de viabilidad y persistencia) ya están implementadas y verificadas contra Atlas real. El frontend actualmente solo tiene shell + login (sin dashboard ni productos específicos). La tarea 9 (orquestador + agentes) no ha empezado y su espec está pendiente, por lo que el dashboard no puede bloquearse en ella.

El objetivo es definir decisiones técnicas que permitan avanzar en el MVP del dashboard respetando las restricciones del stack actual (Angular 22 SSR, signals, standalone components), manteniendo bundle size bajo, evitando deuda técnica innecesaria y dejando puntos de integración claros para futuras tareas (RAG, orquestador).

## Decisión

Evaluamos alternativas para cada uno de los nueve puntos críticos y decidimos lo siguiente:

### 1. Stack visual: Tailwind 4 con @angular/cdk

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Tailwind 4 + @angular/cdk (elegida) | Tokens nativos, sin CSS-in-JS runtime, mejor tree-shaking, encaja con tokens del design system, soporta signals/standalone components, output pequeño | Requiere aprendizaje de utility-first si el equipo no lo conoce |
| Angular Material | Componentes preconstruidos, buena documentación, theming integrado | Bundle más grande, depende de estilos complejos, menos control fino sobre tokens, posible sobrecarga de runtime en SSR |
| CSS modules | Escopado local, sin conflictos de nombres, familiar para desarrolladores CSS | No soporta tokens de diseño centralizados, requiere preprocesador (Sass/Less) para variables, menos árbol-shaking que Tailwind |
| Sass puro | Control total, sintaxis anidada familiar, ampliamente conocido | Requiere compilación adicional, genera CSS muerto si no se purga bien, menos eficiente en tree-shaking que utility-first |

**Por qué esta:**  
Tailwind 4 ofrece tokens de diseño nativos que pueden alinearse directamente con las especificaciones del producto (colores, espaciado, tipografía). Al no requerir un runtime de CSS-in-JS, evita sobrecarga en el servidor durante SSR y permite un mejor tree-shaking en el bundle del cliente. La combinación con @angular/cdk proporciona primitives accesibles (overlay, a11y, portals) necesarios para componentes como diálogos y menús sin reinventar la rueda. Encaja perfectamente con la arquitectura de signals y standalone components de Angular 22.

**Consecuencias:**  
- Positiva: Bundle inicial más pequeño, estilos purgados en build, tokens de diseño centralizados y fácilmente actualizables.  
- Negativa: Curva de aprendizaje para el equipo si proviene de metodologías CSS tradicionales (se mitiga con documentación y pair programming).  
- Neutra: Requiere instalación de dependencias `tailwindcss@latest`, `@angular/cdk` y configuración de `postcss` y `tailwind.config.js` (trabajo mecánico de una hora).

### 2. Estrategia de datos en dev: ApiService interface + 2 implementaciones (Real/Fixture)

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| ApiService interface + RealApiService + FixtureApiService (elegida) | Simple, explícito, cero dependencias externas, fácil de testear, permite cambiar behavior con flag de entorno, no introduce deuda de mocks que haya que borrar | Requiere mantener dos implementaciones (pero son simples delegaciones) |
| Mocks con MSW | Intercepta requests reales, comportamiento cercano a producción, útil para testing de integración | Añade complejidad (service worker, configuración), introduce deuda técnica (hay que recordar borrarlo para prod), sobrekill para el MVP |
| Fixtures como JSON estático + HttpClient directo | Muy sencillo, cero abstracciones | Dispersa la lógica de fixtureado por componentes, dificulta cambiar a API real posteriormente, viola DRY |
| Doble implementación (real + mock) sin interface | Menos código inicial | Acopla lógica de mock a componentes, dificulta testing unitario y cambia comportamiento según flags no centralizados |

**Por qué esta:**  
Definimos una interfaz `ApiService` con métodos como `getPromotions()`, `getPromotionViability(id)` y `sendChatMessage(message)`. Luego proporcionamos dos implementaciones en el entorno de desarrollo:  
- `RealApiService`: usa `HttpClient` + token de Clerk para llamar al API desplegado en Render.  
- `FixtureApiService`: lee archivos JSON estáticos bajo `/assets/fixtures/` (generados a partir de `fixtures/companies/kavana-viability-executive/docs/promociones.yaml` mediante un script de seeding ligero).  

El flag `useFixtureApi` se coloca en `environment.ts` (y variantes) para alternar entre ambas sin tocar código. Esta estrategia cumple con YAGNI (no introduce MSW ni otras dependencias) y evita crear mocks que luego haya que eliminar cuando se conecte al API real.

**Consecuencias:**  
- Positiva: Permite trabajar en UX sin depender de la disponibilidad de Render, tests predecibles, transición suave a API real cambiando solo un flag.  
- Negativa: Requiere mantener los archivos JSON de fixture actualizados (se mitiga generándolos automáticamente desde el YAML fuente en el proceso de build).  
- Neutra: El tamaño del bundle no se ve afectado porque la implementación no utilizada se elimina mediante tree-shaking (Angular Ivy + optimizaciones de producción).

### 3. Chat widget (alcance MVP): ChatPanel presentacional + MockChatService

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Componente ChatPanel presentacional + MockChatService (elegida) | Aísla la lógica de chat del UI, permite trabajar en el dashboard sin bloquearse en la tarea 9, interfaz estable para futura inyección de OrquestadorService, simulación realista con delay y respuestas hardcoded | Las respuestas son estáticas (se reemplazarán en tarea 9) |
| Comentado / oculto hasta tarea 9 | Cero código, cero riesgo de sobreingeniería | No se puede validar UX ni flujo de trabajo del dashboard, dificulta testing de integración del panel |
| Implementación real desde el principio (llamando a tarea 9) | Evita trabajo doble | Bloquea el dashboard hasta que la tarea 9 esté lista, viola YAGNI e incrementa riesgo de dependencias circulares |
| WebSocket directo a servicio externo | Experiencia real de streaming | Sobrekill para MVP, introduce fallos de red no relacionados con el dashboard, dificulta testing local |

**Por qué esta:**  
El componente `ChatPanel` será totalmente presentacional: recibe un arreglo de mensajes `{role: 'user'|'assistant', content: string, timestamp: Date}` y un método `send(message: string)` que delega en un servicio inyectado. En desarrollo, se inyectará `MockChatService`, que:  
- Tiene un conjunto hardcoded de respuestas para las 5 preguntas MVP (sobre promociones, KPIs, viabilidad, ingresos, margen).  
- Simula latencia de red con `setTimeout` (500-1500ms variado).  
- Opcionalmente simula streaming mostrando el carácter a carácter con `setInterval` (configurable).  

En la tarea 9, basta con sustituir el provider de `MockChatService` por `OrquestadorService` (que implementará la misma interfaz) sin tocar el componente `ChatPanel`. Esto cumple con el principio de inversión de dependencias y mantiene el dashboard libre de bloqueos.

**Consecuencias:**  
- Positiva: Permite avanzar en el dashboard inmediatamente, testeable en isolation, transición sin cambios en UI cuando llegue la tarea 9.  
- Negativa: Las respuestas del mock no serán inteligentes (pero eso es esperado y documentado).  
- Neutra: El mock no aumenta el bundle size en producción porque se reemplaza por el provider real (ambos son inyectables ligeros).

### 4. Gráficos: SVG inline para sparklines y progress bars

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| SVG inline (elegida) | Cero bundle size, control total del estilo (tokens de diseño), sin dependencias externas, compatible con SSR (no requiere window/document en renderizar) | Requiere escribir lógica de generación de paths (pero es trivial para sparklines/barras) |
| Recharts | Componentes React con wrappers Angular, buena documentación | Bundle significativo, depende de D3 bajo el capó, posible hidratación mismatched en SSR |
| Chart.js | Popular, tipos de gráficos variados | Bundle medio, requiere canvas (problemas en SSR), menos control fino sobre estilos que SVG |
| ECharts | Poderoso, buen tree-shaking, renderizado canvas/SVG | Bundle aún significativo aunque tree-shakable, complejidad de configuración |
| D3 puro | Máxima flexibilidad, estándar web | Bundle alto si se usa todo, curva de aprendizaje empinada, manipulación DOM directa (riesgosa en SSR) |

**Por qué esta:**  
Para el MVP, los gráficos necesarios son: sparklines de tendencia de pre-ventas o ingresos, y barras de progreso para porcentaje de cumplimiento contra objetivos (ej. pre-ventas ≥ 30%). Estos pueden generarse con unas pocas líneas de SVG usando los tokens de diseño de Tailwind (colores, grosor, radios). Al no depender de librerías externas, eliminamos riesgos de hidratación en SSR, reducimos el bundle a cero para esta funcionalidad y mantenemos el control total sobre animaciones y interacciones (si se necesitan posteriormente). Si en el futuro se requieren visualizaciones más complejas (heatmaps, sankey, etc.), reevaluaremos entonces con librerías tree-shakables como Apache ECharts.

**Consecuencias:**  
- Positiva: Bundle inicial mínimo, cero dependencias de gráficos, estilos 100% alineados con el design system, seguro para SSR.  
- Negativa: Se debe escribir y mantener código de generación de SVG (encapsulado en servicios puros, testeables unitariamente).  
- Neutra: La complejidad es lineal con el número de tipos de gráfico; para sparklines y barras es trivial.

### 5. RBAC mapping: AuthService signal + directiva *appHasRole + RouteGuards

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| AuthService signal role$ + *appHasRole + RouteGuards (elegida) | Simple, explícito, sin dependencias externas, aprovecha la infraestructura existente de Clerk y guards, tipo seguro con enum de roles | Requiere crear directiva y servicio (pero son pocos líneas) |
| CASL (o similar) | Poderoso para reglas complejas, políticas centralizadas, manejo de acciones y recursos | Sobrekill para un solo rol por usuario (jerarquía simple), bundle extra, curva de aprendizaje, posible sobreingeniería en MVP |
| Hardcodear roles en plantillas y guards | Cero abstracciones iniciales | Dispersa la lógica de autorización, viola DRY, dificulta cambiar roles o añadir nuevos |
| Almacenar rol en estado global (NgRx/Signals) sin directiva | Centraliza el rol disponible | Aún se necesita directiva o guards para usar esa información en plantillas/rutas |

**Por qué esta:**  
El dominio actual maneja una jerarquía simple de roles (ej. `admin`, `viewer`, `editor`) que llega como claim `roles` en el token de Clerk (tarea 4 ya lo hace). No se necesita un motor de permisos complejo como CASL porque los permisos se derivan directamente del rol (ej. `admin` puede todo, `viewer` solo lectura). Por tanto:  
- `AuthService` expone un signal `role$` derivado de `ClerkService.userClaims`.  
- Se crea una directiva estructural *appHasRole que muestra/oculta elementos si el signal role$ incluye alguno de los roles pasados.  
- Los `RouteGuards` existentes (`authGuard` + `rolesGuard`) continúan protegiendo rutas basado en el mismo claim.  

Esta approche es explícita, testeable y reutiliza la infraestructura de autenticación ya presente. Evita introducir una librería externa para un problema que se resuelve con unas pocas líneas de TypeScript.

**Consecuencias:**  
- Positiva: Código sencillo, tipo seguro, integración natural con signals de Angular, cero bundle extra (solo el servicio y la directiva).  
- Negativa: Si en el futuro aparecen permisos basados en recursos (ej. "solo puede editar sus propias promociones"), habrá que evolucionar el modelo (pero eso sería un cambio de requisito, no un fallo del diseño actual).  
- Neutra: El signal `role$` puede usarse en cualquier componente para mostrar información contextual (ej. "Bienvenido, admin").

### 6. Multi-tenant y Clerk: companyId del JWT se usa solo para mostrar "Empresa: X"

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| companyId se usa solo para mostrar "Empresa: X" en top bar (elegida) | Simple, cero sobrecarga, confía en que la API respeta el token (tarea 7 ya filtra por companyId), evita duplicar lógica de filtrado en cliente | Requiere certeza absoluta de que la API nunca fugará datos de otros tenants |
| companyId se usa para filtrar adicionales en cliente (p.ej. en store o queries) | Defensa en profundidad, protege contra fallos de backend | Introduce complejidad, riesgo de inconsistencias entre cliente y API, posible sobrefiltrado que oculte datos legítimos, viola el principio de fuente única de verdad (la API) |
| Ignorar companyId completamente en frontend | Cero código en frontend | No se puede mostrar información de tenant al usuario, dificulta UX multi-tenant |

**Por qué esta:**  
La tarea 4 ya extrae el `companyId` del claim `https://kavana-viability-executive/company_id` del token de Clerk y lo pone a disposición mediante middleware (`company-id.middleware.ts`) que lo adjunta al request como `req.companyId`. La tarea 7 ya implementó el filtrado en el nivel de servicio: `ViabilityService.listarPromociones(companyId)` y `calcularViabilidadPromocion(companyId, ...)` usan ese `companyId` para hacer coincidir los índices de MongoDB `(companyId, promotionId)`. Por tanto, el frontend no necesita hacer ningún filtrado adicional: basta con confiar en que la API, dada una petición autenticada, devolverá únicamente datos pertenecientes al `companyId` del token.  

El único uso del `companyId` en el frontend será mostrarlo en la barra superior (o en un perfil de usuario) para dar contexto al usuario sobre qué empresa está consultando (útil en caso de que tenga acceso a múltiples tenants, aunque hoy el dominio asume un solo tenant activo por sesión).

**Consecuencias:**  
- Positiva: Cero lógica de filtrado en frontend, menos superficie de error, aprovecha el trabajo ya hecho en API y auth.  
- Negativa: Depende totalmente de la corrección del filtrado en API (pero eso ya está testeado y verificado en tarea 7).  
- Neutra: El `companyId` se lee una vez al iniciar sesión (desde `ClerkService`) y se almacena en un signal para uso en plantillas; no se vuelve a leer por petición.

### 7. SSR y datos: Server routes con TransferState para /dashboard y /promotions/:id

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Rutas /dashboard y /promotions/:id con server route + TransferState (elegida) | Elimina doble fetch en navegación inicial, mejora LCP al tener KPIs en HTML inicial, mantiene separación de responsabilidades (datos en server route, UI en componente), caché automático de estado entre servidor y cliente | Requiere escribir server routes (pero son simples wrappers alrededor de HttpClient) |
| Client-side fetching únicamente (HttpClient en OnInit) | Muy sencillo, cero código de servidor, familiar para desarrolladores Angular | Doble fetch en navegación inicial (servidor renderiza esqueleto, cliente luego fetch), peor LCP, posible parpadeo de contenido vacío |
| Angular Universal State Transfer manual (sin server routes) | Control fino sobre qué se transfiere | Más verboso, fácil de olvidar transferir algún estado, pierde la ventaja de las server routes de Angular 22 |
| Pre-renderizado estático con datos de fixture | HTML inicial con datos reales, cero fetch en cliente | Datos estáticos que pueden quedarse obsoletos, no refleja cambios en tiempo real, solo útil para sitios de marketing |

**Por qué esta:**  
Angular 22 introdujo first-class soporte para server routes mediante `export const serverRoutes: ServerRoute[]` y `provideServerRendering(withRoutes(serverRoutes))`. Esto permite definir rutas que se renderizan completamente en el servidor (incluyendo la extracción de datos) antes de enviar el HTML al cliente.  

Para el dashboard:  
- La ruta `/dashboard` tendrá una server route que llama al API (`GET /promotions` y quizás `/promotions/:id/viability` para el primer ítem) usando `HttpClient` inyectado (funciona en servidor porque Angular proporciona un adaptador que hace fetch externo).  
- Los resultados se almacenan en `TransferState` mediante las claves conocidas (ej. `makeStateKey('promotions')`).  
- En el navegador, el componente consulta primero `TransferState`; si encuentra los datos, los usa directamente y evita hacer el fetch nuevamente.  

Los endpoints que involucran IA (chat, futuro RAG/orquestador) se marcarán explícitamente como `renderMode: RenderMode.Client` en `serverRoutes` porque dependen de estado de sesión o de streaming que no tiene sentido pre-renderizar. Esta distinción ya se vio en `app.routes.server.ts` donde `login` y `dashboard` son `Server` (por ahora sin datos) y el comodín `**` también es `Server` (redirección a login).  

Al mover el fetching de datos a la capa de server route, conseguimos que el HTML inicial ya contenga los datos del dashboard (lista de promociones, KPIs calculados), lo que mejora significativamente el LCP y elimina el parpadeo de contenido vacío. Además, como los datos se fetching una sola vez (en servidor o en cliente según corresponda), no hay riesgo de inconsistencias entre lo visto inicialmente y lo que se actualiza tras la hidratación.

**Consecuencias:**  
- Positiva: Mejor LCP y FCP, eliminación de doble fetch en navegación inicial, experiencia de carga más fluida, SEO amigable (los datos aparecen en el HTML fuente).  
- Negativa: Requiere mantener server routes (pero son simples y pocos).  
- Neutra: El tamaño del bundle del cliente no aumenta porque la lógica de fetching se transfiere efectivamente al servidor (el cliente solo necesita el pequeño código para leer de TransferState).

### 8. Accesibilidad: WCAG 2.2 AA como mínimo, keyboard-first

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| WCAG 2.2 AA como mínimo, keyboard-first (elegida) | Cumple con estándares legales y éticos, mejora experiencia para todos los usuarios (no solo aquellos con discapacidad), menudo requiere poco esfuerzo adicional si se considera desde el inicio, evita retrabajo costoso | Requiere atención al detalle en contraste, foco, labels y orden de tabulación |
| Solo WCAG 2.1 A | Menos trabajo inicial | Deja brechas de accesibilidad que podrían excluir usuarios, riesgo de no cumplir con regulaciones futuras |
| Ignorar accesibilidad hasta fase posterior | Cero esfuerzo inicial | Acumula deuda de accesibilidad que será mucho más costosa de pagar después, riesgo de exclusión de usuarios desde el lanzamiento |
| Dependencia exclusivamente de librerías de componentes accesibles (ej. Angular Material) | Aprovecha el trabajo de otros | Ainda requiere verificar que se use correctamente, posible sobredependencia, menos control fino sobre personalización |

**Por qué esta:**  
El producto es una herramienta B2B utilizada por promotoras y sus equipos para tomar decisiones económicas importantes. Excluir a usuarios por razones de accesibilidad no solo es éticamente reprobable, sino que también puede tener implicaciones legales según la jurisdicción. Adoptar WCAG 2.2 AA desde el inicio garantiza que:  
- Todos los elementos interactivos tengan contraste suficiente (texto sobre fondo, íconos, bordes).  
- La navegación sea totalmente operable mediante teclado (tab, enter, espacio, flechas).  
- Los elementos tengan labels y descriptions claros para lectores de pantalla.  
- Se evite usar color como único medio de información (se complementa con texto, íconos o patrones).  
- Los componentes personalizados (como el chat widget o los gráficos SVG) se construyan siguiendo las prácticas ARIA recomendadas.  

Este enfoque se alinea con el principio de diseño inclusivo y reduce la probabilidad de tener que rehacer componentes complejos más adelante por fallos de accesibilidad detectados tardíamente.

**Consecuencias:**  
- Positiva: Producto utilizable por el mayor número posible de usuarios, reducción de riesgo legal y ético, mejor usabilidad general (muchas prácticas de accesibilidad benefician a todos, ej. labels claros).  
- Negativa: Requiere tiempo adicional en diseño y testing (pero se compensa con menos retrabajo posterior).  
- Neutra: Muchas verificaciones pueden automatizarse con linters de accessibility (ej. eslint-plugin-jsx-a11y adaptado a Angular) y pruebas en CI con herramientas como axe-core.

### 9. Bundle size budgets: initial < 180kb gzip, dashboard lazy < 60kb gzip, chat lazy < 80kb gzip

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Presupuestos estrictos como declarados (elegida) | Fuerza a mantener el rendimiento bajo control, incentiva división lógica en chunks (dashboard, chat, etc.), mejora experiencia en redes lentos y dispositivos de bajo rendimiento, alineado con métricas web vitales | Requiere vigilancia continua en el proceso de build, puede limitar ciertas funcionalidades si no se cuida la dependencia |
| Sin presupuestos, optimizar después | Máxima libertad de desarrollo inicial | Riesgo de terminar con bundles grandes que requieran refactorización costosa, mala experiencia de carga inicial, dificultad para cumplir con SLAs de rendimiento |
| Presupuestos más laxos (ej. initial 300kb) | Menos presión inmediata | Sigue riesgo de rendimiento pobre, especialmente en mercados con conexiones móviles lentas o datos limitados |
| Solo medir, no hacer cumplir | Conciencia de tamaño sin límites duros | Fácil de excederse sin darse hasta que sea tarde, falta de responsabilidad en el desarrollo |

**Por qué esta:**  
El roadmap ya estableció como no funcional crítico que la aplicación sea usable en conexiones móviles moderadas y en dispositivos de gama media-baja. Los presupuestos propuestos son ambiciosos pero alcanzables dado el stack actual y las decisiones anteriores:  
- **Initial < 180kb gzip**: incluye el shell de Angular, el sistema de routing, Clerk básico, estilos críticos de Tailwind (purged) y el código necesario para mostrar el login y redirigir.  
- **Dashboard lazy < 60kb gzip**: contiene el código específico del dashboard (gráficos SVG inline, componentes de tarjetas, tabla de promociones, etc.) sin incluir el chat (que se lazy-load separado).  
- **Chat lazy < 80gb gzip**: incluye el componente ChatPanel, MockChatService (o OrquestadorService en el futuro) y cualquier lógica de simulación de streaming.  

Estos números se alcanzan mediante:  
- Uso de Tailwind con purging agresivo de CSS no utilizado.  
- Estrategia de lazy-loading por ruta: el dashboard y el chat son módulos separados cargados solo cuando se navega a `/dashboard` (el chat puede ser un subcomponente lazy dentro del dashboard módulo).  
- Ausencia de librerías pesadas de gráficos (se usa SVG inline).  
- Evita de dependencias de estado global pesadas (se usa signals y servicios inyectables ligeros).  
- Aprovecha la compilación y optimización del Ivy de Angular 22.  

Se verificará en cada build de producción mediante el presupuesto integrado de Angular (`maximumWarning` y `maximumError` en `angular.json` o `project.json`).

**Consecuencias:**  
- Positiva: Aplicación rápida de cargar, buena experiencia en condiciones de red adversas, menor consumo de datos para usuarios móviles, mejor posicionamiento en métricas de rendimiento web (LCP, FID, CLS).  
- Negativa: Requiere monitoreo continuo del tamaño de bundle (pero esto es buena práctica de ingeniería independientemente).  
- Neutra: Los presupuestos pueden ajustarse hacia abajo si se descubre que hay margen (ej. tras eliminar código muerto) o hacia arriba si se justifica una nueva funcionalidad esencial (pero siempre bajo revisión explícita).

## Consecuencias globales

**Positivas:**  
- Stack moderno y performante: Tailwind 4 + signals + standalone components + SSR optimizado.  
- Independencia de bloqueos externos: el dashboard puede avanzar sin esperar a la tarea 9 (orquestador + agentes) gracias a estrategias de mock bien definidas.  
- Código mantenible y testeable: interfaces claras, separación de responsabilidades, uso de señales y inyección de dependencias.  
- Bundle size bajo control desde el inicio, lo que mejora la adopción en condiciones reales de red.  
- Accesibilidad considerada desde el diseño, reduciendo riesgo de retrabajo futuro y mejorando usabilidad universal.  
- Aprovecha inversión existente: reusa auth, persistencia y motor de viabilidad sin rehacer lo ya hecho.  

**Negativas / tradeoffs:**  
- Curva de aprendizaje potencial en Tailwind y signals si el equipo proviene de enfoques más tradicionales (mitigable con pairing y documentación).  
- Requiere disciplina en mantener actualizados los fixtures de desarrollo (pero esto se puede automatizar).  
- La confianza en el filtrado de `companyId` en API coloca una carga de prueba adicional en el backend (pero ya está cubierta por los tests de tarea 7).  
- Los presupuestos de bundle size pueden limitar ciertas funcionalidades de terceros si su peso es excesivo (pero esto fomenta buscar alternativas más ligeras o lazy-loading selectivo).  

**Neutras:**  
- El enfoque elegido es evolutivo: cada decisión deja puertas abiertas para futuras mejoras (ej. sustituir SVG por ECharts si se necesitan gráficos complejos, reemplazar MockChatService por OrquestadorService, etc.).  
- Ninguna decisión compromete gravemente la arquitectura central del monorepo ni las tecnologías base (Nx, Angular 22, NestJS 11, Clerk, MongoDB).  

## Señal de revisión

Este ADR se revisará cuando se cumpla cualquiera de las siguientes condiciones:  
1. **Inicio de la tarea 9 (orquestador + agentes)**: para validar que la estrategia de MockChatService permite una transición sin fricción al OrquestadorService real.  
2. **Primer feedback de usuarixs reales sobre el dashboard**: para contrastar las decisiones de UX (gráficos SVG, accesibilidad, flujo de chat) con necesidades observadas y ajustar si es necesario.  
3. **Cambio significativo en el diseño de tokens o en el requerimiento de visualizaciones avanzadas**: para reevaluar la elección de SVG inline vs. librería de gráficos externa.  
4. **Descubrimiento de que el presupuesto de bundle size inicial se excede de forma consistente en builds de producción**: para revisar las decisiones de dependencias y lazy-loading antes de que se vuelva crónico.  

En ausencia de estos eventos, el ADR se considerará estable hasta el cierre de la fase 0 (MVP de tareas 1-10).

## Referencias

- [Spec de producto](docs/specs/producto.md)  
- [Spec: Motor de viabilidad](docs/specs/viability-engine.md)  
- [ADR-001: Stack](docs/adr/ADR-001-stack.md)  
- [ADR-002: Despliegue y CI/CD](docs/adr/ADR-002-despliegue-cicd.md)  
- [ADR-003: Motor de viabilidad](docs/adr/ADR-003-viability-engine.md)  
- [ADR-004: Persistencia en MongoDB](docs/adr/ADR-004-persistencia-mongodb.md)  
- [ADR-005: Rebrand a Kavana Viability Executive](docs/adr/ADR-005-rebrand-kavana-viability-executive.md)  
- [ADR-006: MongoDB Atlas bad auth](docs/adr/ADR-006-mongodb-atlas-bad-auth.md)  
- [ADR-007: Directiva de calidad y modelo de relación](docs/adr/ADR-007-directiva-calidad-y-modelo-relacion.md)  
- Archivos de referencia del código:  
  - `apps/web/src/environments/environment.ts` (flag `useFixtureApi`)  
  - `apps/web/src/app/app.routes.ts` y `app.routes.server.ts` (rutas y SSR)  
  - `apps/web/src/app/auth/auth.guard.ts` (protección de rutas)  
  - `apps/api/src/viability/` (servicios, controllers, schemas ya existentes)  
  - `fixtures/companies/kavana-viability-executive/docs/promociones.yaml` (fuente de fixtures)