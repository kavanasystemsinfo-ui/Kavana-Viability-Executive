# Análisis de negocio para MVP sin dominio

## Contexto
El proyecto KVE nace sin experiencia previa en el sector inmobiliario; este documento describe cómo se abordó el análisis de negocio cuando no se controla el dominio.

## Supuestos de partida
Lista de hipótesis explícitas sobre cómo trabaja una promotora y qué problemas tiene:
1. Las promotoras usan hojas de cálculo dispersas para evaluar promociones.
2. El criterio de viabilidad cambia según la persona que lo evalúa.
3. No hay una fuente única de verdad para los datos de cada promoción.
4. Las decisiones se basan en experiencia personal más que en datos consistentes.
5. El margen bruto es el indicador principal que las promotoras miran primero.
6. La velocidad de venta y el nivel de pre-venta son factores críticos en la decisión.
7. Existe un umbral de margen bruto mínimo que determina si una promoción es viable.

## Cómo validé (o validaría) cada supuesto con poco esfuerzo
Para validar estos supuestos con un esfuerzo mínimo:
- Entrevistaría a 2-3 promotores locales (por ejemplo, de Castellón o Valencia) para entender su proceso actual.
- Crearía una landing page explicativa que describiera el problema y la solución propuesta, midiendo el interés mediante registros.
- Desarrollaría un prototipo muy básico (solo el motor de cálculo) y lo probaría con un promotor amigo para validar la utilidad.
- Métricas a observar: tiempo dedicado actualmente a cálculos, nivel de frustración con el proceso actual, disposición a pagar por una solución.

## Qué aprendería con un usuario real aunque fuera simulado
Aunque el usuario fuera simulado, aprendería:
- Feedback sobre si el cálculo de margen bruto tiene sentido para su toma de decisiones.
- Opiniones sobre el umbral de viabilidad propuesto (¿es demasiado alto/bajo?).
- Comentarios sobre la UX: ¿qué información querrían ver primero en un dashboard?
- Qué datos adicionales considerarían importantes que no estén en el modelo actual.
- Si confiarían en un sistema automatizado para tomar decisiones de inversión.

## Riesgos del enfoque actual
Si el supuesto principal es falso (por ejemplo, si las promotoras ya usan un sistema centralizado y no tienen problemas con hojas dispersas):
- El motor de viabilidad (pieza técnica más desarrollada) tendría menos valor inmediato.
- El foco en hojas de cálculo como problema principal sería incorrecto, requiriendo un pivote.
- Sin embargo, el proceso de análisis, la capacidad de aprender rápidamente y entregar un MVP seguiría siendo válido para demostrar habilidades.
- Partes que podrían seguir teniendo valor: la arquitectura técnica, los ADRs, la demostración de rigor en testing y documentación.

## Conclusión
Honestidad: esto es un MVP de portafolio, no un análisis validado. Sirve para demostrar proceso de análisis de negocio cuando no se conoce el dominio, no para asegurar viabilidad comercial. El valor está en mostrar cómo se formulan hipótesis, cómo se planifica su validación y cómo se mantiene la objetividad a pesar de la incertidumbre inicial.
