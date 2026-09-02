import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="shell-container">
      <app-topbar></app-topbar>
      <div class="shell-content">
        <app-sidebar></app-sidebar>
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .shell-content {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    
    .main-content {
      flex: 1;
      margin-left: 250px; /* Same width as sidebar */
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    
    /* Responsive - adjust for mobile */
    @media (max-width: 768px) {
      .shell-content {
        flex-direction: column;
      }
      
      .main-content {
        margin-left: 0;
      }
      
      .sidebar {
        position: fixed;
        top: 56px; /* Below topbar */
        left: 0;
        height: calc(100vh - 56px);
        z-index: 900;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      
      .sidebar.open {
        transform: translateX(0);
      }
    }
  `]
})
export class ShellComponent {}