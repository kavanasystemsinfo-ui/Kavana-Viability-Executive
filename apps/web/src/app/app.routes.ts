import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';

/**
 * Rutas de la aplicación.
 *
 * Públicas: /login (inicio de sesión). La raíz redirige a /login. Protegidas:
 * /dashboard (authGuard).
 */
export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
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
    redirectTo: 'login',
  },
];
