import { Component, inject, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="topbar-content">
        <div class="logo">
          <a routerLink="/">
            <span class="logo-text">Kavana</span>
            <span class="logo-subtext">Viability Executive</span>
          </a>
        </div>

        <div class="search-bar">
          <input type="text" placeholder="Buscar promociones..." class="search-input" />
          <button class="search-button">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        <div class="user-profile">
          <div class="user-info">
            <span class="user-name">{{ authService.userDisplayName() }}</span>
            <span class="user-company">{{
              authService.companyId$() || 'kavana_viability_executive'
            }}</span>
          </div>
          <button class="chat-toggle-button" (click)="toggleChatPanelEvent.emit()">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 15l3-3m0 0l-3-3m3 3h-12"></path>
            </svg>
          </button>
          <button class="logout-button" (click)="authService.signOut()">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        height: 56px;
        background-color: var(--surface);
        border-bottom: 1px solid rgba(15, 42, 74, 0.08);
        display: flex;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 1000;
      }

      .topbar-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .logo-text {
        font-weight: 600;
        font-size: 1.25rem;
        color: var(--ink);
      }

      .logo-subtext {
        font-size: 0.875rem;
        color: var(--ink-secondary);
      }

      .search-bar {
        display: flex;
        align-items: center;
        background-color: var(--bg);
        border-radius: 0.375rem;
        overflow: hidden;
        border: 1px solid rgba(15, 42, 74, 0.1);
        flex: 1;
        max-width: 300px;
        margin: 0 1rem;
      }

      .search-input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: none;
        background-color: transparent;
        color: var(--ink);
        font-size: 0.875rem;
      }

      .search-input:focus {
        outline: none;
      }

      .search-button {
        padding: 0.5rem 0.75rem;
        background-color: transparent;
        border: none;
        color: var(--ink-secondary);
        cursor: pointer;
      }

      .search-button:hover {
        background-color: rgba(15, 42, 74, 0.05);
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .user-info {
        display: flex;
        flex-direction: column;
      }

      .user-name {
        font-weight: 500;
        color: var(--ink);
        font-size: 0.875rem;
      }

      .user-company {
        font-size: 0.75rem;
        color: var(--ink-secondary);
      }

      .logout-button {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background-color: transparent;
        border: none;
        color: var(--ink-secondary);
        cursor: pointer;
        border-radius: 0.25rem;
      }

      .logout-button:hover {
        background-color: rgba(15, 42, 74, 0.05);
        color: var(--ink);
      }

      .chat-toggle-button {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background-color: transparent;
        border: none;
        color: var(--ink-secondary);
        cursor: pointer;
        border-radius: 0.25rem;
      }

      .chat-toggle-button:hover {
        background-color: rgba(15, 42, 74, 0.05);
        color: var(--ink);
      }
    `,
  ],
})
export class TopbarComponent {
  authService = inject(AuthService);
  router = inject(Router);

  @Output() toggleChatPanelEvent = new EventEmitter<void>();
}
