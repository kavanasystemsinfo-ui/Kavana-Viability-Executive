import { Component } from '@angular/core';
import { ChatPanelComponent } from '../core/chat/chat-panel.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [ChatPanelComponent],
  template: `
    <div class="chat-page">
      <app-chat-panel></app-chat-panel>
    </div>
  `,
  styles: [
    `
      .chat-page {
        display: flex;
        height: 100vh;
      }
    `,
  ],
})
export class ChatPageComponent {}
