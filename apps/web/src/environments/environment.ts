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
  /**
   * Flag para alternar entre datos del fixture JSON local y la API real de
   * Render. Arranca en `true` (fase 1: desarrollo local sin Atlas verificado).
   * Cambiar a `false` cuando la cadena real esté lista (Atlas verificado +
   * Render con secret desplegado).
   * @see docs/adr/ADR-008-dashboard-angular.md (decisión 2)
   */
  useFixtureApi: true,
  /**
   * URL base del API de Render. Solo se usa cuando `useFixtureApi` es `false`.
   * En desarrollo local con `nx serve api`, el servidor corre en 3000.
   */
  apiBaseUrl: 'http://localhost:3000/api',
  /**
   * companyId por defecto para los server fetches (server routes con
   * TransferState). En producción viene del JWT de Clerk; aquí está
   * hardcoded porque la sesión de Clerk solo vive en el navegador.
   */
  fixtureCompanyId: 'kavana_viability_executive',
};
