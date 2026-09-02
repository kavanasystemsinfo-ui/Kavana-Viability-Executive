import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Promotion } from './api.types';
import type { ViabilityResult } from './api.types';
import { ApiService } from './api.service';

@Injectable()
export class FixtureApiService extends ApiService {
  private http = inject(HttpClient);

  listPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>('/assets/fixtures/promotions.json');
  }

  getPromotion(id: string): Observable<Promotion> {
    return this.http.get<Promotion[]>(`/assets/fixtures/promotions.json`).pipe(
      map(promotions => {
        const found = promotions.find(p => p.id === id);
        if (!found) {
          throw new Error(`Promotion with id ${id} not found`);
        }
        return found;
      })
    );
  }

  getViability(id: string): Observable<ViabilityResult> {
    // For MVP, we'll return mock viability data based on the promotion
    return this.http.get<Promotion[]>(`/assets/fixtures/promotions.json`).pipe(
      map(promotions => {
        const promo = promotions.find(p => p.id === id);
        if (!promo) {
          throw new Error(`Promotion with id ${id} not found`);
        }
        // Return mock viability data based on the promotion
        return {
          revenueExpectedEur: promo.unitsTotal * 100000, // Mock calculation
          marginBrutoEur: promo.unitsTotal * 20000,
          marginBrutoPct: 20.0,
          preVentasPct: (promo.unitsSold || 0) / promo.unitsTotal * 100,
          costPerUnitEur: 50000,
          costPerM2Eur: 1000,
          avgPriceM2Eur: 2000,
          unitsConsistent: true,
          speedVentaUdsMes: 5.0,
          viable: true,
          umbralMarginAplicadoPct: 18.0,
          warnings: []
        };
      })
    );
  }
}