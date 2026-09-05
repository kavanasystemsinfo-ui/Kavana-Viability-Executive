import { Injectable } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { of, concatMap, filter } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import type { ChatMessage } from './chat.types';
import { ChatService } from './chat.service';

export interface ChatResponse {
  respuesta: string; // Markdown string
  datos?: unknown;
  fuentes?: string[];
  sources: string[];
}

@Injectable()
export class RealChatService extends ChatService {
  private apiUrl = '/api/chat'; // relative to origin
  private http: HttpClient;

  constructor(http: HttpClient) {
    super();
    this.http = http;
  }

  override streamMessage$(prompt: Observable<string>): Observable<ChatMessage> {
    return prompt.pipe(
      filter((text: string) => text.trim().length > 0),
      switchMap((text: string) => {
        // Emit user message first
        const userMessage: ChatMessage = {
          role: 'user',
          content: text,
          timestamp: new Date(),
        };
        // Return an observable that concatenates the user message and the assistant message
        return of(userMessage).pipe(concatMap(() => this.getAssistantResponse(text)));
      }),
    );
  }

  private getAssistantResponse(text: string): Observable<ChatMessage> {
    return this.http.post<ChatResponse>(this.apiUrl, { message: text }).pipe(
      map((response) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.respuesta,
          timestamp: new Date(),
          sources: response.sources,
        };
        return assistantMessage;
      }),
      catchError((error) => {
        console.error('Error calling chat API', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Lo siento, ocurrió un error al procesar su solicitud: ${error.message || 'Error desconocido'}`,
          timestamp: new Date(),
        };
        return of(errorMessage);
      }),
    );
  }
}
