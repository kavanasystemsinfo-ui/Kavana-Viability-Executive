import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { ChatPanelComponent } from '../core/chat/chat-panel.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ChatPanelComponent],
  template: `
    <div class="shell-container">
      <app-topbar (toggleChatPanelEvent)="toggleChatPanel()"></app-topbar>
      <div class="shell-content">
        <app-sidebar></app-sidebar>
        <div class="main-container">
          <main class="main-content">
            <router-outlet></router-outlet>
          </main>
          <app-chat-panel
            [class.chat-panel-open]="isChatPanelOpen"
            class="chat-panel"
          ></app-chat-panel>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
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

      .main-container {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .main-content {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-panel {
        width: 0;
        overflow: hidden;
        transition: width 0.3s ease;
        border-left: 1px solid rgba(15, 42, 74, 0.1);
        display: flex;
        flex-direction: column;
      }

      .chat-panel-open {
        width: 350px;
      }

      /* Responsive - adjust for mobile */
      @media (max-width: 768px) {
        .shell-content {
          flex-direction: column;
        }

        .main-container {
          flex-direction: column;
          height: 200px;
        }

        .main-content {
          margin-left: 0;
          height: calc(100% - 200px);
        }

        .chat-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0;
          overflow: hidden;
          transition: height 0.3s ease;
          border-top: 1px solid rgba(15, 42, 74, 0.1);
          border-left: none;
          z-index: 1000;
        }

        .chat-panel-open {
          height: 300px;
          width: 100%;
        }
      }
    `,
  ],
})
export class ShellComponent {
  isChatPanelOpen = false;

  toggleChatPanel(): void {
    this.isChatPanelOpen = !this.isChatPanelOpen;
  }
}
