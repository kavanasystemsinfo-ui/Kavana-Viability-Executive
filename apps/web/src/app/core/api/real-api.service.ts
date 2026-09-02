import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { Promotion } from './api.types';
import type { ViabilityResult } from './api.types';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class RealApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly apiBaseUrl = environment.apiBaseUrl || '';

  listPromotions(): Observable<Promotion[]> {
    return from(this.authService.getClerkToken()).pipe(
      switchMap(token => {
        const headers = { Authorization: `Bearer ${token}` };
        return this.http.get<Promotion[]>(`${this.apiBaseUrl}/api/promotions`, { headers });
      })
    );
  }

  getPromotion(id: string): Observable<Promotion> {
    return from(this.authService.getClerkToken()).pipe(
      switchMap(token => {
        const headers = { Authorization: `Bearer ${token}` };
        return this.http.get<Promotion>(`${this.apiBaseUrl}/api/promotions/${id}`, { headers });
      })
    );
  }

  getViability(id: string): Observable<ViabilityResult> {
    return from(this.authService.getClerkToken()).pipe(
      switchMap(token => {
        const headers = { Authorization: `Bearer ${token}` };
        return this.http.get<ViabilityResult>(`${this.apiBaseUrl}/api/promotions/${id}/viability`, { headers });
      })
    );
  }
}