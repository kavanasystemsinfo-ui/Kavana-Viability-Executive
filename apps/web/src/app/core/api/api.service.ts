import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Promotion } from './api.types';
import type { ViabilityResult } from './api.types';

/**
 * Abstract service for data access.
 *
 * IMPORTANT: la publishableKey de Clerk es PÚBLICA por diseño (viaja en el
 * bundle del navegador), por eso puede committearse aquí. La secret key de
 * Clerk debe manejarse exclusivamente en el backend (apps/api) y nunca debe
 * viajar por el frontend ni quedar expuesta en el código cliente.
 */
@Injectable({ providedIn: 'root' })
export abstract class ApiService {
  abstract listPromotions(): Observable<Promotion[]>;
  abstract getPromotion(id: string): Observable<Promotion>;
  abstract getViability(id: string): Observable<ViabilityResult>;
}