export const listarPromocionesTool = {
  type: 'function',
  function: {
    name: 'listarPromociones',
    description:
      'Lista las promociones disponibles para la empresa, aplicando filtros según el rol del usuario.',
    parameters: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'ID de la empresa' },
        role: { type: 'string', description: 'Rol del usuario (viewer, analyst, admin)' },
      },
      required: ['companyId', 'role'],
    },
  },
};
