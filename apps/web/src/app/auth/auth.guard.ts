import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { ClerkService } from 'ngx-clerk';

const CLERK_LOAD_TIMEOUT_MS = 5000;

/**
 * Guard de rutas protegidas. Espera a que Clerk termine de cargar (con tope de
 * 5 segundos) y permite el acceso solo con sesión activa. Sin sesión redirige
 * a /login.
 *
 * En el servidor (SSR) no existe sesión de Clerk: la redirección es inmediata
 * y el render de la ruta protegida se convierte en un 302 a /login.
 */
export const authGuard: CanActivateFn = async () => {
  const clerk = inject(ClerkService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    return router.createUrlTree(['/login']);
  }

  const deadline = Date.now() + CLERK_LOAD_TIMEOUT_MS;
  while (!clerk.isLoaded() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (clerk.isLoaded() && clerk.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
