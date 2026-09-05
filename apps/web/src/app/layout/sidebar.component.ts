import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HasRoleDirective } from '../core/auth/has-role.directive';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, HasRoleDirective, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar-content">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <span class="logo-text">Kavana</span>
            <span class="logo-subtext">Viability</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M7 8h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 16h10"></path>
            </svg>
            <span class="nav-label">Overview</span>
          </a>

          <a routerLink="/promotions" routerLinkActive="active" class="nav-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              ></path>
            </svg>
            <span class="nav-label">Promotions</span>
          </a>

          <a routerLink="/chat" routerLinkActive="active" class="nav-item">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21 15a2 2 0 01-2 2H11l3 3V8a6 6 0 00-6-6 6 6 0 00-6 6v6h-2a2 2 0 01-2-2v-3a6 6 0 016-6 6 6 0 016 6v3a2 2 0 012 2z"
              ></path>
            </svg>
            <span class="nav-label">Chat AI</span>
          </a>

          <div class="nav-item" *appHasRole="['Admin']">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span class="nav-label">Configuración</span>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="version-info">
            <span class="version-text">v0.0.1</span>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 250px;
        background-color: var(--ink);
        color: var(--surface);
        height: 100vh;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 900;
        display: flex;
        flex-direction: column;
      }

      .sidebar-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .sidebar-header {
        padding: 1.5rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .logo-text {
        font-weight: 600;
        font-size: 1.25rem;
        color: var(--surface);
      }

      .logo-subtext {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
      }

      .sidebar-nav {
        flex: 1;
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        border-left: 3px solid transparent;
        transition: all 0.2s ease;
      }

      .nav-item:hover {
        background-color: rgba(255, 255, 255, 0.05);
        color: var(--surface);
        border-left-color: var(--ai);
      }

      .nav-item.active {
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--surface);
        border-left-color: var(--surface);
      }

      .nav-item svg {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-right: 0.75rem;
      }

      .nav-label {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .sidebar-footer {
        padding: 1.5rem 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }

      .version-text {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
      }

      /* Responsive - hide sidebar on small screens */
      @media (max-width: 768px) {
        .sidebar {
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        .sidebar.open {
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class SidebarComponent {
  // TODO: Add sidebar toggle functionality for mobile
}
