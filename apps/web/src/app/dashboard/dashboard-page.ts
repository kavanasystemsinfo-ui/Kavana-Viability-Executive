import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClerkService } from 'ngx-clerk';

/**
 * Ruta protegida por authGuard. Mínimo imprescindible: identidad de la sesión
 * y cierre de sesión. El resto de módulos (viabilidad, RAG) llegan en tareas
 * posteriores.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <section class="dashboard">
      <h1>Panel de control</h1>
      <p>
        Sesión iniciada con
        <strong>{{ userEmail }}</strong
        >.
      </p>
      <button type="button" (click)="signOut()">Cerrar sesión</button>
      <a routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 2rem 1rem;
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 0 auto;
    }
    button {
      align-self: flex-start;
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
  `,
})
export class DashboardPageComponent {
  private readonly clerk = inject(ClerkService);
  private readonly router = inject(Router);

  readonly userEmail = this.clerk.user()?.primaryEmailAddress?.emailAddress ?? '';

  async signOut(): Promise<void> {
    await this.clerk.signOut();
    await this.router.navigate(['/login']);
  }
}
