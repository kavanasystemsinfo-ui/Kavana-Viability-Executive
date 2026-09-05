# ADR-009: Orquestador agente IA — arquitectura multi-proveedor, OpenRouter por defecto y entrega en dos fases

**Estado:** Propuesto (a aprobar por Jorge)
**Fecha:** 2026-09-04

## Contexto

El proyecto Kavana Viability Executive (KVE) ha entregado ya verificado, según se documenta en la spec correspondiente, las capas de visión de negocio, dominio modelado, motor determinista puro, API REST (`GET /api/promotions` y `GET /api/promotions/:id/viability`), autenticación con roles (viewer/analyst/admin) y dashboard Angular 22 con shell + login. Falta la pieza final de la cadena: el orquestador conversacional que traduzca consultas en lenguaje natural a invocaciones del motor de viabilidad mediante function calling, devolviendo respuestas citadas y operativas.

El objetivo de este ADR es fijar las decisiones arquitectónicas del orquestador que la spec ya anticipa pero no resuelve: cómo se elige y configura el proveedor LLM, cómo se controla el coste de producción sin sacrificar la veracidad, cómo se formatea la respuesta y en qué orden se entrega. Estas decisiones condicionan la sostenibilidad operativa del agente (proveedor por defecto), la portabilidad multi-tenant (configuración por usuario) y el flujo de integración con el dashboard (entrega por fases).

## Decisión

Evaluamos alternativas para cada uno de los seis puntos críticos y decidimos lo siguiente:

### 1. Arquitectura multi-proveedor LLM (adapter pattern)

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Single provider directo (ej. OpenAI nativo) | SDK maduro, latencia baja, documentación amplia | Aísla al usuario final del proveedor elegido por la organización; cualquier cambio de proveedor implica cambio de código y redeploy |
| Single provider vía OpenRouter con un solo modelo | Punto único de integración, una sola clave que rotar | Ata la flexibilidad al elegir un único modelo y proveedor concreto; no resuelve el problema de fondo (lock-in) |
| Multi-proveedor con adapter pattern y configuración por usuario (elegida) | El usuario elige proveedor y modelo desde Ajustes sin tocar código; permite arrancar con OpenRouter free y migrar a pago o a un proveedor privado cuando se justifique, sin redeploy; cada adaptador aísla diferencias de SDK y formato de function calling | Más código de adapters (uno por proveedor soportado); pruebas unitarias y de integración adicionales para cada adapter |

**Por qué esta:**  
El dominio del proyecto exige que la elección de proveedor sea decisión del usuario final (la organización que opera KVE), no del equipo de desarrollo. Esto es coherente con la directriz de ADR-007 (veracidad operativa y honestidad sobre las decisiones tomadas) y con la separación entre capacidades construidas y configurables. Definimos una interfaz `LLMProviderAdapter` con métodos como `chatCompletion(messages, tools) → AssistantMessage` y un catálogo de implementaciones (`OpenAIAdapter`, `AnthropicAdapter`, `GeminiAdapter`, `DeepSeekAdapter`, `OpenRouterAdapter`). El orquestador (`OrquestadorService` en el backend) resuelve el adapter correspondiente al campo `llmProvider` de `user_settings` en tiempo de petición. La primera versión soporta los cinco proveedores verificados en la spec; añadir un sexto es trivial (nuevo adapter que cumpla la interfaz).

**Consecuencias:**
- Positiva: Flexibilidad total para el usuario, optimización de coste por organización, portabilidad entre proveedores.
- Negativa: Coste inicial de implementar cinco adapters; cada adapter requiere pruebas de su contrato específico (formato de tools, streaming, errores).
- Neutra: La decisión de qué proveedores soportar es extensible mediante convención (cualquier SDK que implemente la interfaz es registrable sin tocar el orquestador).

### 2. OpenRouter como proveedor por defecto (optimización de coste inicial)

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| OpenAI directo | SDK estable, modelos potentes (GPT-4o, etc.) | Requiere claves de pago desde el primer momento; sin tier gratuito operativo; ata el coste del MVP a crédito del usuario |
| Gemini directo (Google AI Studio) | Acceso a Gemini Flash, tier gratuito generoso | Requiere cuenta Google con verificación; las condiciones de uso del tier gratuito pueden cambiar; un único proveedor detrás |
| Ollama local | Sin coste por uso, datos nunca salen del servidor | Requiere infraestructura adicional (contenedor con GPU o CPU potente), no portable a Render tal cual; complica el despliegue del MVP |
| OpenRouter como default con modelos free (elegida) | Acceso a múltiples modelos gratuitos (`google/gemini-flash-1.5`, `meta/llama-3.1-8b-instruct:free`, etc.) sin claves de pago; abstracción sobre múltiples modelos bajo una única URL y una única clave; permite cambiar de modelo sin tocar código | OpenRouter queda como intermediario; latencia ligeramente superior a llamada directa; condiciones de tier gratuito propias del agregador |

**Por qué esta:**  
La spec define como directriz operativa que el MVP arranque con coste de producción esencialmente cero en infraestructura LLM sin sacrificar trazabilidad ni veracidad. OpenRouter cubre esa directriz porque expone una API unificada y soporta modelos gratuitos verificados (`google/gemini-flash-1.5` entre ellos) que pueden invocarse sin tarjeta de crédito, manteniendo las mismas capacidades de function calling que un modelo de pago. Al ser además la propia decisión 1 un patrón multi-proveedor, fijar OpenRouter como default no contradice la portabilidad: el usuario puede migrar a OpenAI nativo o a Gemini directo desde Ajustes cuando lo justifique el volumen o la sensibilidad de los datos.

**Consecuencias:**
- Positiva: Coste inicial cero, portabilidad entre modelos free, ventana operativa de MVP sin consumo de crédito.
- Negativa: Dependencia del propio agregador OpenRouter como intermediario (latencia añadida, condiciones de tier sujetas a cambio).
- Neutra: La elección de modelo concreto dentro de OpenRouter es configurable por el usuario; el default sugerido al instalar KVE es `google/gemini-flash-1.5` por su buen equilibrio entre calidad y latencia en function calling.

### 3. Configuración por usuario/empresa en base de datos (no global)

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Variables de entorno del servidor (un único proveedor para todos) | Cero código adicional, configuración en despliegue | Obliga a todos los tenants a compartir proveedor y modelo; cualquier cambio requiere redeploy; rompe la multi-tenancy real |
| Configuración por usuario/empresa en colección `user_settings` (elegida) | Multi-tenancy real: cada organización elige su proveedor, su modelo, su presupuesto y su clave; el cambio aplica en caliente sin redeploy; los presupuestos (`maxTokensPerDay`, `maxRequestsPerDay`) son individuales | Necesidad de cifrar las claves en reposo; un esquema de validación más cuidado; un endpoint adicional (`PUT /api/user/settings/llm`) con su autorización |
| Configuración por empresa con override por usuario | Granularidad máxima | Sobreingeniería para el MVP: hoy se asume una configuración por organización; añadir un nivel más sin un requisito claro viola YAGNI |

**Por qué esta:**  
El esquema de la colección `user_settings` definido en la spec tiene cinco campos (`llmProvider`, `modelName`, `apiKey`, `maxTokensPerDay`, `maxRequestsPerDay`) y se guarda por usuario/empresa. Esto encaja con la multi-tenancy ya existente (filtrado por `companyId` en servicios) y permite que cada organización opere con su propio presupuesto sin afectar a las demás. El cifrado de `apiKey` en reposo es obligatorio y su esquema concreto (KMS del proveedor cloud frente a cifrado simétrico con clave en variable de entorno) se confirma en la fase de implementación como cuestión abierta ya documentada.

**Consecuencias:**
- Positiva: Multi-tenancy real, presupuesto individual, cambio de proveedor en caliente.
- Negativa: Necesidad de cifrado de claves (decisión de esquema en implementación); endpoint adicional para gestionar la configuración.
- Neutra: El modelo de datos es extensible: si en el futuro se requiere override por usuario dentro de empresa, basta con añadir un nivel adicional en la jerarquía sin romper lo existente.

### 4. Rate limiting condicional (solo si el proveedor es de pago)

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Rate limit siempre activo, incluso para modelos free | Uniformidad de comportamiento; defensa uniforme contra abuso | Aplica fricción gratuita sobre modelos sin coste por uso (los modelos free de OpenRouter); penaliza al usuario que opera legítimamente dentro del tier gratuito |
| Rate limit nunca activo | Cero complejidad | Riesgo de coste descontrolado si el usuario migra a un proveedor de pago y el servicio recibe volumen inesperado; un solo request problemático puede agotar crédito |
| Rate limit condicional según tier del proveedor/modelo (elegida) | UX limpia para free (sin fricción artificial); control de coste para pago (los presupuestos de `user_settings` aplican de verdad); detección automática a partir del proveedor/modelo configurado | Un punto más de lógica condicional en el servicio de tracking; pruebas necesarias para ambos caminos (free y pago) |

**Por qué esta:**  
La spec define que el rate limiting se aplica únicamente cuando el proveedor configurado es de pago, porque los modelos gratuitos no tienen coste por uso. La detección se realiza por una función pura `esModeloPago(provider, model) → boolean` mantenida en el catálogo de proveedores. Esta función consulta una tabla declarativa (no una lista hardcoded dispersa por el código) y es testeable unitariamente. Cuando el modelo es de pago, se aplican los presupuestos `maxTokensPerDay` y `maxRequestsPerDay` con el mensaje amable definido en la spec al superarlos; cuando es free, esos presupuestos siguen registrándose para que el usuario vea consumo, pero no bloquean peticiones.

**Consecuencias:**
- Positiva: UX limpia para free, control de coste efectivo para pago, telemetría útil en ambos casos.
- Negativa: La función `esModeloPago` debe mantenerse actualizada cuando OpenRouter cambie su catálogo de modelos free; se mitiga con tests y revisión en cada release del catálogo.
- Neutra: La política de reintentos y mensaje amable ante timeout del LLM se trata como cuestión abierta de implementación, ya listada en la spec.

### 5. Formato de respuesta Markdown natural + JSON bajo solicitud explícita

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Siempre JSON estructurado | Interoperabilidad programática garantizada | UX muy pobre para el usuario final (tablas y listas son Markdown); el widget frontend tendría que renderizar JSON a algo legible |
| Siempre Markdown natural | UX limpia para el usuario final | Quien quiera consumir el agente programáticamente (ej. un script) tiene que parsear Markdown; pierde interoperabilidad |
| Markdown por defecto + JSON bajo solicitud explícita del usuario (elegida) | UX clara para el caso humano (95% del tráfico esperado); interop opcional para integraciones; el widget renderiza Markdown nativamente sin capa adicional | Necesidad de detección de intención del usuario al pedir JSON; una pieza más de lógica condicional en el orquestador |

**Por qué esta:**  
El widget frontend renderiza Markdown por defecto (ya contemplado en la decisión del ADR-008 sobre el ChatPanel), lo que hace que el caso natural sea Markdown con tablas, viñetas y negrita. La spec define además que cuando el usuario pide explícitamente formato máquina (`"dame los datos en JSON"`, `"formato JSON"`, `"output JSON"`, etc.), el agente devuelve un objeto estructurado con tres campos: `respuesta` (texto Markdown), `datos` (objeto con los datos crudos utilizados) y `fuentes` (array de endpoints consultados y parámetros). La detección se hace por palabras clave explícitas sobre la consulta del usuario, no por inferencia, para evitar ambigüedad y mantener la veracidad del formato entregado. El widget dispone de un toggle opcional (de uso de desarrollo) para ver el JSON crudo.

**Consecuencias:**
- Positiva: UX clara por defecto, interop opcional, widget simple.
- Negativa: La detección por palabras clave explícitas puede fallar ante formulaciones inesperadas; se documenta la lista de disparadores y se mantiene ampliable.
- Neutra: El formato Markdown cumple con la guía de estilo del producto (idioma español, formato numérico español con punto para miles y coma para decimales) ya definida en el prompt de sistema de la spec.

### 6. Entrega en dos fases: endpoint standalone primero, widget dashboard después

**Alternativas evaluadas:**

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Desarrollo simultáneo de endpoint y widget | Una sola entrega, sin fase intermedia | Dificulta aislar fallos (¿es del orquestador o de la integración?); incrementa la superficie de pruebas en cada cambio; bloquea la verificación del orquestador hasta tener UI |
| Endpoint standalone primero, widget después (elegida) | Verificación temprana del orquestador aislado (curl, Postman, tests de integración); depuración simple; rollback trivial (basta con no desplegar el widget); cumple con la decisión 3 del ADR-008 sobre el `MockChatService` (que se sustituye por `OrquestadorService` sin tocar `ChatPanel`) | Doble entrega (Fase 1 y Fase 2); dos despliegues en lugar de uno |
| Widget primero con mock, orquestador después | Empieza por la UX visible | El widget queda bloqueado hasta tener el orquestador; reproduce el riesgo que el ADR-008 ya decidió evitar con la estrategia de mock |
| Versión del endpoint por fase (`/api/chat/v1`, `/api/chat/v2`) | Versionado explícito de API | Añade complejidad de enrutado sin valor claro cuando el contrato del endpoint no cambia entre fases; la versión es del widget, no del endpoint |

**Por qué esta:**  
La spec divide la entrega en dos fases ya descritas: Fase 1 (`POST /api/chat` standalone, verificado con curl/Postman, con cobertura de pruebas unitarias e integración del orquestador, prompt y herramientas) y Fase 2 (integración del agente como widget de chat en el dashboard, reutilizando el contexto de sesión, con 3-5 sugerencias predefinidas y banner de privacidad). Esta separación permite que la verificación end-to-end del orquestador sea independiente de cualquier cambio en el dashboard, lo que reduce el radio de fallo en cada cambio y hace rollback trivial. Además conecta directamente con la decisión 3 del ADR-008: el `ChatPanel` ya está preparado para sustituir `MockChatService` por `OrquestadorService` cuando la Fase 1 esté verificada, lo que evita retrabajo en el componente presentacional.

**Consecuencias:**
- Positiva: Verificación temprana del orquestador, depuración simple, rollback trivial, integración limpia con el widget ya preparado.
- Negativa: Dos entregas secuenciales en lugar de una sola.
- Neutra: El endpoint `POST /api/chat` no se versiona entre fases: el contrato es estable desde Fase 1 y Fase 2 lo consume sin cambios.

## Consecuencias globales

**Positivas:**
- Coste de producción inicial cercano a cero (OpenRouter free + rate limiting condicional) sin sacrificar veracidad ni trazabilidad: el orquestador cita fuentes en cada respuesta y nunca inventa cifras.
- Portabilidad multi-tenant real: cada organización elige su proveedor, modelo, claves y presupuesto desde Ajustes, sin redeploy y sin afectar a otras.
- Capacidad construida sobre lo ya verificado: el orquestador reutiliza el motor determinista, los endpoints REST existentes, el filtrado por `companyId` y el filtrado por rol del dashboard, sin duplicar lógica.
- Alineamiento con ADR-007: la configuración y las decisiones operativas son explícitas y auditables (proveedor, modelo, presupuestos, formato); no se presentan como capacidades teóricas sino como comportamiento del sistema entregado.
- Verificación end-to-end antes de integración UI: Fase 1 permite demostrar que el agente responde con datos del motor real, citando endpoints y aplicando formato, antes de invertir esfuerzo en el widget.

**Negativas / tradeoffs:**
- Cinco adapters a mantener (uno por proveedor soportado) con sus pruebas; añadir un sexto proveedor requiere trabajo mecánico adicional.
- OpenRouter como intermediario introduce latencia ligeramente superior a llamada directa y dependencia de las condiciones de su tier gratuito.
- Cifrado de claves en reposo requiere decidir esquema en fase de implementación (KMS frente a cifrado simétrico con clave en variable de entorno).
- Detección de modelos free/pago mantenida manualmente y susceptible a cambios del catálogo de OpenRouter; se mitiga con tests y revisión por release.

**Neutras:**
- Las decisiones dejan puertas abiertas para evolucionar (override por usuario dentro de empresa, añadir proveedores, sofisticar la detección de formato JSON), sin condicionar la arquitectura central.
- El endpoint `POST /api/chat` se mantiene estable entre Fase 1 y Fase 2, por lo que consumidores externos que se integren durante Fase 1 no se ven afectados cuando llegue la widget.

## Señal de revisión

Este ADR se revisará cuando se cumpla cualquiera de las siguientes condiciones:

1. **Finalización de Fase 1**: para confirmar que la verificación end-to-end del orquestador aislado cumple los criterios de la spec (citación de fuentes, formato Markdown, formato JSON bajo solicitud, rate limiting condicional) antes de pasar a Fase 2.
2. **Migración de un usuario real a un proveedor de pago**: para validar que el camino pago (rate limiting activo, presupuestos respetados, banner de privacidad desactivado) funciona como se describe y que los adapters de pago (OpenAI nativo, Anthropic) están al nivel de calidad del adapter de OpenRouter.
3. **Cambio significativo en el catálogo de modelos free de OpenRouter**: para revisar la función `esModeloPago` y los defaults sugeridos al usuario.
4. **Aparición de un requisito de privacidad estricto (PII o datos financieros confidenciales)**: para forzar la revisión del banner informativo y considerar si en algún caso debe pasar de informativo a bloqueante.
5. **Descubrimiento de que el cifrado de claves en reposo no es suficiente para el nivel de sensibilidad exigido**: para evolucionar el esquema (KMS nativo del proveedor cloud, Vault, etc.).

En ausencia de estos eventos, el ADR se considerará estable hasta el cierre de la Fase 2 (integración del widget en el dashboard).

## Referencias

- [Spec: Agente asesor de viabilidad](docs/specs/agente-asesor-viabilidad.md)
- ADR-007: Directiva de calidad y modelo de relación
- ADR-008: Dashboard Angular — Stack, datos y arquitectura (decisión 3 sobre `ChatPanel` + `MockChatService` → `OrquestadorService`)
- ADR-003: Motor de viabilidad (origen de la lógica determinista que el orquestador invoca)
- ADR-004: Persistencia en MongoDB (origen del filtrado por `companyId` que el orquestador hereda)
- Archivos de referencia del código a crear en implementación:
  - `apps/api/src/orchestrator/orquestador.service.ts` (resolución de adapter y prompt de sistema)
  - `apps/api/src/orchestrator/adapters/*.adapter.ts` (un adapter por proveedor soportado)
  - `apps/api/src/orchestrator/tools/listar-promociones.tool.ts` y `calcular-viabilidad-promocion.tool.ts` (declaración de function calling)
  - `apps/api/src/chat/chat.controller.ts` (`POST /api/chat`)
  - `apps/api/src/user-settings/user-settings.schema.ts` (colección `user_settings` con `llmProvider`, `modelName`, `apiKey` cifrado, `maxTokensPerDay`, `maxRequestsPerDay`)
  - `apps/web/src/app/chat/orquestador.service.ts` (cliente HTTP del widget, sustituye a `MockChatService`)