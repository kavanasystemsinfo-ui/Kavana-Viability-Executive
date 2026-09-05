import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ChatMessage } from './chat.types';

/**
 * Abstract service for chat functionality.
 * Allows swapping between mock and real implementations.
 */
@Injectable({ providedIn: 'root' })
export abstract class ChatService {
  abstract streamMessage$(prompt: Observable<string>): Observable<ChatMessage>;
}
