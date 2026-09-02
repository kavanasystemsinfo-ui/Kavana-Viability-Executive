import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';

/**
 * Rutas de la aplicación.
 *
 * Públicas: /login (inicio de sesión). La raíz redirige a /login.
 * Protegidas: /(shell) -> shell layout con child routes:
 *   - /dashboard (Overview)
 *   - /promotions (tabla)
 *   - /promotions/:id (detalle)
 *   - /chat (AI takeover)
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
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/overview-page').then((m) => m.OverviewPageComponent),
      },
      {
        path: 'promotions',
        loadComponent: () => import('./dashboard/promotions-page').then((m) => m.PromotionsPageComponent),
      },
      {
        path: 'promotions/:id',
        loadComponent: () => import('./dashboard/promotion-detail-page').then((m) => m.PromotionDetailPageComponent),
      },
      {
        path: 'chat',
        loadComponent: () => import('./dashboard/chat-page').then((m) => m.ChatPageComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];