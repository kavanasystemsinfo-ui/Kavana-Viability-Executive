import type { ServerRoute } from '@angular/ssr';
import { RenderMode } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // La sesión de Clerk solo existe en el navegador: el login y el dashboard
    // se renderizan bajo demanda en el servidor (el guard redirige a /login
    // cuando no hay sesión) en lugar de pre-renderizarse.
    path: 'login',
    renderMode: RenderMode.Server,
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
