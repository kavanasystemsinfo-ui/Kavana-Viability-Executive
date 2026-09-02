/**
 * Entorno de la aplicación web.
 *
 * IMPORTANTE: la publishableKey de Clerk es PÚBLICA por diseño (viaja en el
 * bundle del navegador), por eso puede committearse aquí. La secret key de
 * Clerk jamás va en el frontend ni se commitea.
 */
export const environment = {
  production: false,
  clerk: {
    publishableKey: 'pk_test_Z3JlYXQtc3VuZmlzaC02MzY5LmNsZXJrLmFjY291bnRzLmRldiQ',
  },
};
