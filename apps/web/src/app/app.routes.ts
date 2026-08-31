import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';

/**
 * Rutas de la aplicación.
 *
 * Públicas: /login (inicio de sesión) y la landing raíz (no hay ruta: se
 * renderiza desde app.html). Protegidas: /dashboard (authGuard).
 */
export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./login/login-page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard-page').then((m) => m.DashboardPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
