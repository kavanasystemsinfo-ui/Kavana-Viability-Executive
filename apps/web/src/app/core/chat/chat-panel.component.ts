import { Component, ViewChild, inject } from '@angular/core';
import type { AfterViewInit, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { scan, startWith } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import type { ChatMessage } from './chat.types';
import { ChatService } from './chat.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-panel">
      <div class="chat-header">
        <h3>AI Assistant</h3>
      </div>

      <div class="privacy-banner">
        <p>Esta conversación puede ser almacenada y revisada para mejorar el servicio. No compartas información personal sensible.</p>
      </div>

      <div class="suggestions">
        <button *ngFor="let suggestion of suggestions" (click)="onSuggestionClick(suggestion)" class="suggestion-button">
          {{ suggestion }}
        </button>
      </div>

      <div class="chat-messages" #messagesContainer>
        <div
          *ngFor="let message of messages$ | async"
          class="message"
          [class.role-user]="message.role === 'user'"
          [class.role-assistant]="message.role === 'assistant'">
          <div class="message-content">{{ message.content }}</div>
          <div class="message-meta">
            <span class="message-role">{{ message.role === 'user' ? 'Tú' : 'IA' }}</span>
            <span class="message-time">{{ message.timestamp | date: 'HH:mm' }}</span>
          </div>

          <div *ngIf="message.sources && message.sources.length" class="message-sources">
            <span *ngFor="let source of message.sources" class="source-chip">{{ source }}</span>
          </div>

          <div *ngIf="message.chips && message.chips.length" class="message-chips">
            <button
              *ngFor="let chip of message.chips"
              class="chip-button"
              (click)="navigateToPromotion(chip.promotionId)"
            >
              {{ chip.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <input
          type="text"
          class="chat-input-field"
          placeholder="Pregunta algo sobre tus promociones..."
          [(ngModel)]="inputValue"
          (keyup.enter)="sendMessage()"
        />
        <button class="send-button" (click)="sendMessage()" [disabled]="!inputValue.trim()">
          Enviar
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--surface);
        border-left: 1px solid rgba(15, 42, 74, 0.1);
      }
      .chat-header {
        padding: 1rem;
        border-bottom: 1px solid rgba(15, 42, 74, 0.1);
        font-weight: 600;
        color: var(--ink);
      }
      .chat-header h3 {
        margin: 0;
        font-size: 1rem;
      }
      .privacy-banner {
        padding: 0.5rem 1rem;
        background-color: rgba(255, 255, 0, 0.1);
        border-left: 4px solid rgba(255, 255, 0, 0.5);
        font-size: 0.8rem;
        color: var(--ink);
        margin: 0 1rem 1rem 1rem;
      }
      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0 1rem 1rem 1rem;
      }
      .suggestion-button {
        background-color: var(--ai);
        color: white;
        border: none;
        border-radius: 0.25rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 0.875rem;
      }
      .suggestion-button:hover:not(:disabled) {
        background-color: var(--ink-hover);
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .message {
        max-width: 80%;
        word-wrap: break-word;
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
      }
      .message.role-user {
        align-self: flex-end;
        background-color: var(--ai);
        color: white;
        border-radius: 1rem 1rem 0.25rem 1rem;
      }
      .message.role-assistant {
        align-self: flex-start;
        background-color: var(--bg);
        border: 1px solid rgba(15, 42, 74, 0.1);
        border-radius: 1rem 1rem 1rem 0.25rem;
        color: var(--ink);
      }
      .message-content {
        line-height: 1.5;
      }
      .message-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        margin-top: 0.25rem;
        opacity: 0.7;
      }
      .message-sources,
      .message-chips {
        margin-top: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }
      .source-chip {
        background-color: rgba(15, 42, 74, 0.1);
        border-radius: 0.25rem;
        padding: 0.125rem 0.5rem;
        font-size: 0.7rem;
      }
      .chip-button {
        background-color: var(--ai);
        color: white;
        border: none;
        border-radius: 0.25rem;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        font-size: 0.75rem;
      }
      .chip-button:hover:not(:disabled) {
        background-color: var(--ink-hover);
      }
      .chat-input {
        display: flex;
        padding: 1rem;
        gap: 0.5rem;
        background-color: var(--bg);
        border-top: 1px solid rgba(15, 42, 74, 0.1);
      }
      .chat-input-field {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid rgba(15, 42, 74, 0.2);
        border-radius: 0.25rem;
        background-color: var(--surface);
        color: var(--ink);
        font-size: 0.875rem;
      }
      .chat-input-field:focus {
        outline: none;
        border-color: var(--ai);
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      }
      .send-button {
        padding: 0.5rem 1rem;
        background-color: var(--ai);
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-weight: 500;
      }
      .send-button:hover:not(:disabled) {
        background-color: var(--ink-hover);
      }
      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ChatPanelComponent implements AfterViewInit {
  private chatService = inject(ChatService);
  private promptSubject = new Subject<string>();
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  readonly messages$ = this.chatService.streamMessage$(this.promptSubject.asObservable()).pipe(
    scan<ChatMessage, ChatMessage[]>((acc, msg) => [...acc, msg], []),
    startWith<ChatMessage[]>([]),
  );

  /** Sugerencias de preguntas rápidas */
  suggestions: string[] = [
    'Lista las promociones disponibles',
    '¿Cuál es la promoción más rentable?',
    'Dame un resumen ejecutivo'
  ];

  inputValue = '';

  ngAfterViewInit(): void {
    this.messages$.subscribe(() => {
      setTimeout(() => {
        if (this.messagesContainer) {
          this.messagesContainer.nativeElement.scrollTop =
            this.messagesContainer.nativeElement.scrollHeight;
        }
      }, 100);
    });
  }

  sendMessage(): void {
    const text = this.inputValue.trim();
    if (!text) return;
    this.promptSubject.next(text);
    this.inputValue = '';
  }

  /** Handle click on a suggestion */
  onSuggestionClick(suggestion: string) {
    this.inputValue = suggestion;
    this.sendMessage();
  }

  navigateToPromotion(promotionId: string): void {
    console.log('Navigating to promotion:', promotionId);
  }
}
