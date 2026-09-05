import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { delay, switchMap, filter } from 'rxjs/operators';
import type { ChatMessage } from './chat.types';
import { ChatService } from './chat.service';

@Injectable()
export class MockChatService extends ChatService {
  private messages = new BehaviorSubject<ChatMessage[]>([]);

  private readonly mockResponses: Record<string, string> = {
    'mas rentable':
      'La promoción más rentable es La Marina - Fase 2 (ID: promo-la-marina-2) con un margen bruto del 20,0%.',
    rojo: 'La promoción está roja porque no cumple con uno o ambos umbrales: margen bruto mínimo (18,0%) y pre‑ventas mínimo (30,0%).',
    compara:
      'Comparativa de KPIs principales: A (1.000.000 €, 20,0%, 25,0%, 5,0 uds/mes), B (1.200.000 €, 18,5%, 28,0%, 4,5 uds/mes), C (900.000 €, 22,0%, 32,0%, 5,5 uds/mes). La mejor en cada métrica: ingresos B, margen C, pre‑ventas C, velocidad C.',
    'resumen ejecutivo':
      'La promoción muestra unos KPIs sólidos con unos ingresos esperados de 1.000.000 €, un margen bruto del 20,0% y unas pre‑ventas del 25,0%. La viabilidad es positiva. Recomendación: mantener la estrategia actual.',
    'necesitan accion':
      'Las promociones que necesitan acción son: La Marina - Fase 2 y Mirador del Mar. Están en estado rojo según los umbrales actuales (margen bruto < 18,0% o pre‑ventas < 30,0%).',
  };

  override streamMessage$(prompt: Observable<string>): Observable<ChatMessage> {
    return prompt.pipe(
      filter((text: string) => text.trim().length > 0),
      switchMap((text: string) => {
        const userMessage: ChatMessage = {
          role: 'user',
          content: text,
          timestamp: new Date(),
        };
        const current = this.messages.getValue();
        this.messages.next([...current, userMessage]);

        const lowerText = text.toLowerCase();
        let responseText =
          'Lo siento, no entiendo la pregunta. Por favor, intenta con una de las preguntas soportadas.';
        for (const key of Object.keys(this.mockResponses)) {
          if (lowerText.includes(key)) {
            responseText = this.mockResponses[key] ?? responseText;
            break;
          }
        }

        return of(responseText).pipe(
          delay(500 + Math.random() * 1000),
          switchMap((fullText) => this.createStreamingMessage(fullText)),
        );
      }),
    );
  }

  private createStreamingMessage(fullText: string): Observable<ChatMessage> {
    return new Observable<ChatMessage>((observer) => {
      const chars = fullText.split('');
      let accumulated = '';
      let index = 0;
      const interval = setInterval(
        () => {
          if (index < chars.length) {
            accumulated += chars[index];
            const message: ChatMessage = {
              role: 'assistant',
              content: accumulated,
              timestamp: new Date(),
            };
            if (accumulated.length > 50) {
              message.sources = ['conocimiento_corporativo.md', 'viability-engine output'];
            }
            if (accumulated.length > 100) {
              message.chips = [
                {
                  label: 'La Marina - Fase 2',
                  promotionId: 'promo-la-marina-2',
                  route: '/promotions/promo-la-marina-2',
                },
              ];
            }
            observer.next(message);
            index++;
          } else {
            clearInterval(interval);
            observer.complete();
          }
        },
        30 + Math.random() * 20,
      );
      return () => clearInterval(interval);
    });
  }

  getMessageHistory(): ChatMessage[] {
    return this.messages.getValue();
  }

  clearHistory(): void {
    this.messages.next([]);
  }
}
