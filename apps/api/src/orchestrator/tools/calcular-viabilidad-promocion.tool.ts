export const calcularViabilidadPromocionTool = {
  type: 'function',
  function: {
    name: 'calcularViabilidadPromocion',
    description:
      'Calcula la viabilidad de una promoción específica usando el motor de viabilidad determinista.',
    parameters: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'ID de la empresa' },
        promotionId: { type: 'string', description: 'ID de la promoción' },
        role: { type: 'string', description: 'Rol del usuario (viewer, analyst, admin)' },
        opciones: {
          type: 'object',
          properties: {
            fechaCorte: {
              type: 'string',
              description: 'Fecha de corte para el cálculo (YYYY-MM-DD)',
            },
            umbralMarginBrutoMinPct: {
              type: 'number',
              description: 'Umbral mínimo de margen bruto (%)',
            },
          },
          required: [],
        },
      },
      required: ['companyId', 'promotionId', 'role'],
    },
  },
};
