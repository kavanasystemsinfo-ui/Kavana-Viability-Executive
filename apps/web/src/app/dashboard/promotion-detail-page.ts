import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '../core/chat/chat-panel.component';
import { inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { API_SERVICE } from '../core/api/api.tokens';
import type { Promotion } from '../core/api/api.types';
import type { ViabilityResult } from '../core/api/api.types';

type CriticalPathStep = string | { text: string; when: string; status: string };

@Component({
  selector: 'app-promotion-detail-page',
  standalone: true,
  imports: [CommonModule, ChatPanelComponent],
  template: `
    <div class="promotion-detail-page">
      <div class="detail-grid">
        <!-- Main content -->
        <div>
          <!-- Hero -->
          <div class="detail-hero" *ngIf="promotion$ | async as promotion; else loadingHero">
            <div class="head">
              <h1>{{ promotion.name }}</h1>
              <span
                class="pill"
                [class.green]="getViabilityStatus(promotion, viability$ | async) === 'green'"
                [class.amber]="getViabilityStatus(promotion, viability$ | async) === 'amber'"
                [class.red]="getViabilityStatus(promotion, viability$ | async) === 'red'"
              >
                <span class="dot"></span>
                {{ promotion.status }}
              </span>
            </div>
            <div class="loc">
              {{ promotion.location.city }}, {{ promotion.location.province }} ·
              {{ promotion.unitsTotal }} unidades
            </div>
          </div>

          <!-- KPIs grandes -->
          <ng-container *ngIf="promotion$ | async as promotion">
            <ng-container *ngIf="viability$ | async as viability; else loadingKpis">
              <div class="detail-kpis">
                <div class="detail-kpi">
                  <div class="label">Ingresos esperados</div>
                  <div class="value">
                    {{
                      promotion.financials?.revenue_contracted_eur ?? 0
                        | currency: 'EUR' : 'symbol-narrow' : '1.0-0' : 'es-ES'
                    }}
                  </div>
                  <div class="sub">Contracted</div>
                </div>
                <div class="detail-kpi">
                  <div class="label">Margen bruto</div>
                  <div class="value">
                    {{
                      promotion.financials?.projected_margin_eur ?? 0
                        | currency: 'EUR' : 'symbol-narrow' : '1.0-0' : 'es-ES'
                    }}
                  </div>
                  <div class="sub">
                    {{ promotion.financials?.projected_margin_pct ?? 0 | number: '1.0-1' }}%
                  </div>
                </div>
                <div class="detail-kpi">
                  <div class="label">Margen bruto (%)</div>
                  <div class="value">
                    {{ promotion.financials?.projected_margin_pct ?? 0 | number: '1.0-1' }}%
                  </div>
                  <div class="sub">
                    {{
                      promotion.financials?.projected_margin_eur ?? 0
                        | currency: 'EUR' : 'symbol-narrow' : '1.0-0' : 'es-ES'
                    }}
                  </div>
                </div>
                <div class="detail-kpi">
                  <div class="label">Pre‑ventas (%)</div>
                  <div class="value">
                    {{
                      (promotion.unitsTotal > 0
                        ? ((promotion.unitsSold ?? 0) / promotion.unitsTotal) * 100
                        : 0
                      ) | number: '1.0-1'
                    }}
                  </div>
                  <div class="sub">
                    {{ promotion.unitsSold ?? 0 }} de {{ promotion.unitsTotal }} uds
                  </div>
                </div>
              </div>
            </ng-container>
          </ng-container>

          <!-- Economía -->
          <div class="section-block" *ngIf="promotion$ | async as promotion; else loadingEconomy">
            <h3>Economía</h3>
            <div class="fin-stats">
              <div class="fin-stat">
                <div class="l">Presupuesto total</div>
                <div class="v">
                  {{
                    promotion.financials?.total_budget_eur ?? 0
                      | currency: 'EUR' : 'symbol' : '1.0-0' : 'es-ES'
                  }}
                </div>
              </div>
              <div class="fin-stat">
                <div class="l">Gastos ejecutados</div>
                <div class="v">
                  {{
                    promotion.financials?.construction_spent_eur ?? 0
                      | currency: 'EUR' : 'symbol' : '1.0-0' : 'es-ES'
                  }}
                </div>
              </div>
              <div class="fin-stat">
                <div class="l">Financiación dispuesta</div>
                <div class="v">
                  {{
                    promotion.financing?.drawn_eur ?? 0
                      | currency: 'EUR' : 'symbol' : '1.0-0' : 'es-ES'
                  }}
                  /
                  {{
                    promotion.financing?.loan_amount_eur ?? 0
                      | currency: 'EUR' : 'symbol' : '1.0-0' : 'es-ES'
                  }}
                </div>
              </div>
              <div class="fin-stat">
                <div class="l">Gastos de suelo</div>
                <div class="v">
                  {{
                    promotion.financials?.land_cost_eur ?? 0
                      | currency: 'EUR' : 'symbol' : '1.0-0' : 'es-ES'
                  }}
                </div>
              </div>
            </div>
            <div class="progress">
              <span [style.width.%]="getBudgetExecutionPercent(promotion)"></span>
            </div>
          </div>

          <!-- Ventas -->
          <div class="section-block" *ngIf="promotion$ | async as promotion; else loadingSales">
            <h3>Ventas</h3>
            <div class="fin-stats">
              <div class="fin-stat">
                <div class="l">Unidades vendidas</div>
                <div class="v">{{ promotion.unitsSold ?? 0 }}</div>
              </div>
              <div class="fin-stat">
                <div class="l">Unidades disponibles</div>
                <div class="v">{{ promotion.unitsAvailable }}</div>
              </div>
              <div class="fin-stat">
                <div class="l">Precio medio m2</div>
                <div class="v">
                  {{
                    promotion.financials?.avg_price_m2_eur ?? 0
                      | currency: 'EUR' : 'symbol-narrow' : '1.0-0' : 'es-ES'
                  }}
                </div>
              </div>
              <div class="fin-stat">
                <div class="l">Avance</div>
                <div class="v">{{ promotion.progress_pct }}%</div>
              </div>
            </div>
          </div>

          <!-- Riesgos -->
          <div class="section-block" *ngIf="promotion$ | async as promotion; else loadingRisks">
            <h3>Riesgos identificados</h3>
            <div class="risk-list">
              <div *ngFor="let risk of promotion.risks; let i = index" class="risk-item">
                <span
                  class="sev"
                  [class.alto]="i === 0"
                  [class.medio]="i === 1"
                  [class.bajo]="i >= 2"
                >
                  {{ i === 0 ? 'alto' : i === 1 ? 'medio' : 'bajo' }}
                </span>
                <span>{{ risk }}</span>
              </div>
            </div>
          </div>

          <!-- Critical path -->
          <div class="section-block" *ngIf="promotion$ | async as promotion; else loadingCritical">
            <h3>Critical path</h3>
            <div class="path-list">
              <div *ngFor="let step of promotion.critical_path" class="path-item">
                <span
                  class="dot"
                  [class.ok]="getStepStatus(step) === 'ok'"
                  [class.en-curso]="getStepStatus(step) === 'en-curso'"
                  [class.pendiente]="getStepStatus(step) === 'pendiente'"
                >
                </span>
                <span>{{ getStepText(step) }}</span>
                <span class="when">{{ getStepWhen(step) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar derecha: Chat -->
        <aside class="ai-rail">
          <h3><span class="dot"></span> AI Executive Summary</h3>
          <div class="sub">Análisis generado · siempre con fuentes citadas</div>
          <app-chat-panel></app-chat-panel>
        </aside>
      </div>

      <!-- Loading states -->
      <div
        *ngIf="(promotion$ | async) === null || (viability$ | async) === null"
        class="loading-container"
      >
        <div class="skeleton-loader">
          <div class="skeleton" style="width: 100%; height: 24px;"></div>
          <div class="skeleton" style="width: 100%; height: 20px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="notFound" class="empty-state">
        <div class="empty">
          <div class="ico">○</div>
          <div class="title">Promoción no encontrada</div>
          <div class="sub">La promoción solicitada no existe o no está disponible.</div>
        </div>
      </div>
    </div>

    <ng-template #loadingHero>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
    <ng-template #loadingKpis>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
    <ng-template #loadingEconomy>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
    <ng-template #loadingSales>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
    <ng-template #loadingRisks>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
    <ng-template #loadingCritical>
      <div class="skeleton-loader">
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
        <div class="skeleton" style="width: 100%; height: 20px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
        <div class="skeleton" style="width: 100%; height: 16px;"></div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .promotion-detail-page {
        padding: 2rem;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 1.5rem;
      }
      @media (max-width: 900px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
      .detail-hero {
        background-color: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      .detail-hero .head {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .detail-hero h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: -0.02em;
      }
      .detail-hero .loc {
        font-size: 0.875rem;
        color: var(--muted);
      }
      .detail-kpis {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .detail-kpi .label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .detail-kpi .value {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: -0.02em;
        display: block;
        font-variant-numeric: tabular-nums;
      }
      .detail-kpi .sub {
        font-size: 0.875rem;
        color: var(--muted);
        display: block;
        margin-top: 0.25rem;
      }
      .section-block {
        background-color: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
      }
      .section-block h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--ink);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .fin-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .fin-stat .l {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .fin-stat .v {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ink);
        display: block;
        margin-top: 0.25rem;
        font-variant-numeric: tabular-nums;
      }
      .progress {
        width: 100%;
        height: 0.5rem;
        background-color: var(--border-soft);
        border-radius: 9999px;
        overflow: hidden;
        margin-top: 0.5rem;
      }
      .progress > span {
        display: block;
        height: 100%;
        background-color: var(--ink);
        transition: width 300ms ease;
      }
      .risk-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .risk-item {
        background-color: rgba(15, 42, 74, 0.02);
        border-radius: 0.25rem;
        padding: 0.5rem;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        font-size: 0.875rem;
      }
      .risk-item .sev {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        border-radius: 9999px;
        padding: 0.125rem 0.5rem;
        flex-shrink: 0;
        letter-spacing: 0.05em;
      }
      .risk-item .sev.alto {
        background-color: rgba(185, 28, 28, 0.12);
        color: var(--red);
      }
      .risk-item .sev.medio {
        background-color: rgba(180, 83, 9, 0.12);
        color: var(--amber);
      }
      .risk-item .sev.bajo {
        background-color: rgba(15, 118, 110, 0.12);
        color: var(--green);
      }
      .path-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .path-item {
        background-color: rgba(15, 42, 74, 0.02);
        border-radius: 0.25rem;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }
      .path-item .dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 9999px;
        flex-shrink: 0;
      }
      .path-item.ok .dot {
        background-color: var(--green);
      }
      .path-item.en-curso .dot {
        background-color: var(--amber);
      }
      .path-item.pendiente .dot {
        background-color: var(--subtle);
      }
      .path-item .when {
        font-size: 0.75rem;
        color: var(--muted);
        margin-left: auto;
        white-space: nowrap;
      }
      .ai-rail {
        background: var(--surface);
        border: 1px solid var(--border-soft);
        border-left: 3px solid var(--ai);
        border-radius: 0.5rem;
        padding: 1rem;
        position: sticky;
        top: calc(56px + 20px); /* topbar height + some offset */
      }
      .ai-rail h3 {
        font-size: 1rem;
        font-weight: 700;
        color: var(--ai);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .ai-rail h3 .dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 9999px;
        background: var(--ai);
      }
      .ai-rail .sub {
        font-size: 0.875rem;
        color: var(--muted);
      }
      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }
      .skeleton-loader {
        display: grid;
        gap: 1rem;
      }
      .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
        text-align: center;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      .empty .ico {
        font-size: 3rem;
        color: var(--muted);
      }
      .empty .title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--ink);
      }
      .empty .sub {
        font-size: 1rem;
        color: var(--muted);
      }
      @media (max-width: 900px) {
        .promotion-detail-page {
          padding: 1rem;
        }
        .detail-grid {
          grid-template-columns: 1fr;
        }
        .ai-rail {
          position: static;
          margin-top: 2rem;
        }
      }
    `,
  ],
})
export class PromotionDetailPageComponent {
  private apiService = inject(API_SERVICE);
  private route = inject(ActivatedRoute);

  promotion$: Observable<Promotion | null> = this.route.params.pipe(
    switchMap((params) => {
      const id = params['id'];
      return this.apiService.getPromotion(id).pipe(
        map((promotion) => promotion ?? null),
        catchError(() => of(null)),
      );
    }),
  );

  viability$: Observable<ViabilityResult | null> = this.route.params.pipe(
    switchMap((params) => {
      const id = params['id'];
      return this.apiService.getViability(id).pipe(
        map((viability) => viability ?? null),
        catchError(() => of(null)),
      );
    }),
  );

  notFound: boolean = false;

  ngOnInit(): void {
    // We'll combine the two observables to set notFound if both are null
    forkJoin([this.promotion$, this.viability$]).subscribe(([promo, viability]) => {
      this.notFound = promo === null && viability === null;
    });
  }

  // Helper methods
  private isStepObject(
    step: CriticalPathStep,
  ): step is { text: string; when: string; status: string } {
    return typeof step !== 'string';
  }

  getStepStatus(step: CriticalPathStep): 'ok' | 'en-curso' | 'pendiente' {
    return this.isStepObject(step) ? (step.status as 'ok' | 'en-curso' | 'pendiente') : 'pendiente';
  }

  getStepText(step: CriticalPathStep): string {
    return this.isStepObject(step) ? step.text : step;
  }

  getStepWhen(step: CriticalPathStep): string {
    return this.isStepObject(step) ? step.when : '';
  }

  getViabilityStatus(
    promotion: Promotion,
    viability: ViabilityResult | null,
  ): 'green' | 'amber' | 'red' {
    if (!viability) return 'red'; // No viability data -> red

    const marginPct = viability.marginBrutoPct;
    const preVentasPct =
      promotion.unitsTotal > 0 ? ((promotion.unitsSold ?? 0) / promotion.unitsTotal) * 100 : 0;

    if (marginPct >= 18 && preVentasPct >= 30) {
      return 'green';
    } else if ((marginPct >= 12 && marginPct < 18) || (preVentasPct >= 15 && preVentasPct < 30)) {
      return 'amber';
    } else {
      return 'red';
    }
  }

  getBudgetExecutionPercent(promotion: Promotion): number {
    if (
      !promotion.financials?.construction_budget_eur ||
      promotion.financials.construction_budget_eur === 0
    ) {
      return 0;
    }
    const spent = promotion.financials?.construction_spent_eur ?? 0;
    const budget = promotion.financials?.construction_budget_eur ?? 0;
    return (spent / budget) * 100;
  }
}
