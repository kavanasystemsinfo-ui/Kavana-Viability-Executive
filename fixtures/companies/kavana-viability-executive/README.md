# Fixture Kavana Apartaments

Promotora inmobiliaria ficticia modelo "Halcyon Motors" (OpenExecutive) para el sector residencial mediterráneo.

## Estructura

```
fixtures/companies/kavana-viability-executive/
├── profile.yaml           # Perfil empresa: misión, visión, métricas, competidores, riesgos
├── people.yaml            # Equipo directivo + jefes de proyecto (8 directivos + 6 JPs)
├── departments.yaml       # 8 departamentos con sub-areas, KPIs, procesos, presupuestos
├── docs/
│   ├── promociones.yaml   # 6 promociones activas con datos financieros, hitos, riesgos
│   ├── escenarios.yaml    # 3 escenarios decisión (pricing, financiación, licencia) estilo MBA
│   └── conocimiento_corporativo.md  # KB corporativa: normativa, ratios, procesos, glosario
└── memory/
    └── episodic.yaml      # Memoria episódica: 10 entradas (decisiones, hitos, juntas, políticas)
```

## Uso en OpenExecutive / Kavana Viability Executive

Esta fixture se carga como perfil de empresa en el sistema multi-agente. Los agentes (CSO, CFO, COO, CLO, CMO, CPO, Board) acceden a:

1. **Profile** → Contexto estratégico, métricas, competidores
2. **People** → Quién decide qué, estilo comunicación, áreas responsabilidad
3. **Departments** → Estructura operativa, KPIs, procesos
4. **Docs/Promociones** → Datos estructurados tiempo real (caja, obra, ventas, financiación)
5. **Docs/Escenarios** → Casos de decisión con opciones, pros/contras, criterios, recomendación
6. **Docs/Conocimiento** → RAG corporativo (normativa, ratios, glosario, proveedores, políticas)
7. **Memory/Episodic** → Memoria de decisiones, hitos, juntas para continuidad conversacional

## Métricas Clave (Sept 2025)

- **Promociones activas**: 6 (2 ejecución, 1 pre-comercialización, 2 proyecto/licencia, 1 due diligence)
- **Unidades en construcción**: 384
- **ARR 2025**: 18,5 M€
- **Caja total**: 4,7 M€ (2,1 M€ libres)
- **Pipeline 2026**: 3 lanzamientos (45M€ necesidad financiación)
- **Margen bruto medio**: 17,5%
- **Certificación energética target**: A/B (todas promociones post-2024)

## Escenarios de Decisión Activos

1. **mediterranea_001** (Strategy): Pricing remanente La Marina + lanzamiento Los Naranjos → Opción C aprobada
2. **mediterranea_002** (Finance): Estructuración deuda 45M€ pipeline 2026 → Opción B aprobada
3. **mediterranea_003** (Operations): Licencia Los Naranjos (alegaciones) → Opción C aprobada

## Próximos Hitos Críticos

- **Oct 2025**: Entrega La Marina F2 (96 uds), licencia Los Naranjos, ejercicio opción Cala Serena
- **Nov 2025**: Lanzamiento comercial Los Naranjos (68/84 uds), cierre financiación Mar Azul/Cala Serena
- **Q1 2026**: Inicio obra Los Naranjos, licencia Mar Azul, due diligence Sol Levant