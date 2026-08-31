import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CLERK_OPTIONS, ClerkService, provideClerk } from 'ngx-clerk';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

/**
 * Proveedor de Clerk.
 *
 * Decisión documentada: si hay publishableKey real, se usa provideClerk (que
 * inicializa ClerkJS en el cliente). Sin clave (entorno local por defecto) se
 * provee igualmente ClerkService con opciones vacías para que el guard de rutas
 * y la página de login funcionen sin romper la inyección de dependencias; en
 * ese estado no existe sesión posible y toda ruta protegida redirige a /login.
 */
const clerkProviders = environment.clerk.publishableKey
  ? [provideClerk({ publishableKey: environment.clerk.publishableKey })]
  : [
      {
        provide: CLERK_OPTIONS,
        useValue: { publishableKey: '' },
      },
      ClerkService,
    ];

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    ...clerkProviders,
  ],
};
