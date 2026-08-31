import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClerkSignInComponent } from 'ngx-clerk';
import { environment } from '../../environments/environment';

/**
 * Página pública de inicio de sesión. Si la publishableKey no está configurada
 * (entorno local sin claves), muestra un aviso en lugar del componente Clerk.
 */
@Component({
  selector: 'app-login-page',
  imports: [ClerkSignInComponent, RouterLink],
  template: `
    <section class="login-page">
      @if (clerkConfigured) {
        <clerk-sign-in />
      } @else {
        <div class="login-placeholder">
          <h2>Autenticación no configurada</h2>
          <p>
            Falta la publishableKey de Clerk en apps/web/src/environments/environment.ts para poder
            iniciar sesión en local.
          </p>
        </div>
      }
      <a routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    .login-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem 1rem;
      font-family: system-ui, sans-serif;
    }
    .login-placeholder {
      max-width: 28rem;
      padding: 1.5rem;
      border: 1px dashed #cbd5e1;
      border-radius: 0.5rem;
      text-align: center;
    }
  `,
})
export class LoginPageComponent {
  readonly clerkConfigured = environment.clerk.publishableKey.length > 0;
}
