/**
 * Entorno de la aplicación web.
 *
 * IMPORTANTE: nunca committear claves reales. La publishableKey de Clerk se
 * configura vía variable de entorno en el despliegue; aquí solo hay un
 * placeholder vacío.
 */
export const environment = {
  production: false,
  clerk: {
    publishableKey: '',
  },
};
