import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TotalRevenuePipe, AvgMarginPctPipe, PresalesRatePipe, AvgVelocityPipe, AttentionRequiredCountPipe, AttentionRequiredPipe, TopByMarginPipe, PromotionsCountPipe } from './pipes/dashboard-pipes';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_SERVICE } from '../core/api/api.tokens';
import type { Promotion } from '../core/api/api.types';

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [CommonModule, TotalRevenuePipe, AvgMarginPctPipe, PresalesRatePipe, AvgVelocityPipe, AttentionRequiredCountPipe, AttentionRequiredPipe, TopByMarginPipe, PromotionsCountPipe],
  template: `
    <div class="overview-page">
      <h1 class="page-title">Overview ejecutivo</h1>
      <p class="page-description">
        Estado agregado de la cartera · {{ promotions$ | async | promotionsCount: 'total' }} promociones activas · {{ promotions$ | async | attentionRequiredCount }} requieren atención
      </p>

      <!-- Loading skeleton -->
      <div *ngIf="(promotions$ | async) === null" class="skeleton-loader">
        <!-- KPI cards skeleton -->
        <div class="kpi-grid-skeleton">
          <div class="skeleton" style="width: 100%; height: 26px;"></div>
          <div class="skeleton" style="width: 100%; height: 26px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
          <div class="skeleton" style="width: 100%; height: 11px;"></div>
        </div>

        <!-- Attention section skeleton -->
        <div class="section-head-skeleton">
          <div class="skeleton" style="width: 60px;"></div>
          <div class="skeleton" style="width: 40%;"></div>
        </div>
        <div class="attention-grid-skeleton">
          <div *ngFor="let i of [1,2,3]" class="attention-card-skeleton">
            <div class="skeleton" style="width: 100%; height: 16px;"></div>
            <div class="skeleton" style="width: 100%; height: 11px;"></div>
            <div class="skeleton" style="width: 100%; height: 11px;"></div>
            <div class="skeleton" style="width: 100%; height: 11px;"></div>
          </div>
        </div>

        <!-- Top promotions skeleton -->
        <div class="card-skeleton">
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="top-list-skeleton">
            <div *ngFor="let i of [1,2,3,4,5]" class="top-item-skeleton">
              <div class="skeleton" style="width: 24px; height: 11px;"></div>
              <div class="skeleton" style="width: 100%; height: 11px;"></div>
              <div class="skeleton" style="width: 60px;"></div>
              <div class="skeleton" style="width: 60px;"></div>
            </div>
          </div>
        </div>

        <!-- Activity timeline skeleton -->
        <div class="card-skeleton">
          <div class="skeleton" style="width: 100%; height: 16px;"></div>
          <div class="timeline-skeleton">
            <div *ngFor="let i of [1,2,3]" class="timeline-item-skeleton">
              <div class="skeleton" style="width: 80px; height: 11px;"></div>
              <div class="skeleton" style="width: 8px; height: 8px; border-radius: 50%;"></div>
              <div class="skeleton" style="width: 100%; height: 11px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actual content -->
      <div *ngIf="(promotions$ | async) !== null" class="overview-content">
        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="card kpi-card">
            <div class="kpi-label">Ingresos esperados</div>
            <div class="kpi-value">{{ promotions$ | async | totalRevenue }}</div>
            <div class="kpi-foot">
              <span class="delta pos">+12.3%</span>
              <span>·</span>
              <span>Cartera contracted</span>
            </div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Margen agregado</div>
            <div class="kpi-value">{{ promotions$ | async | avgMarginPct }}%</div>
            <div class="kpi-foot">
              <span class="delta pos">+2.1 pp</span>
              <span>·</span>
              <span>Promedio ponderado</span>
            </div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Pre-ventas</div>
            <div class="kpi-value">{{ promotions$ | async | presalesRate }}%</div>
            <div class="kpi-foot">
              <span class="delta pos">+5.7 pp</span>
              <span>·</span>
              <span>142 unidades reservadas</span>
            </div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Velocidad media</div>
            <div class="kpi-value">{{ promotions$ | async | avgVelocity | number:'1.0-1' }} uds/mes</div>
            <div class="kpi-foot">
              <span class="delta pos">+0.8</span>
              <span>·</span>
              <span>Sobre 2 activas</span>
            </div>
          </div>
        </div>

        <!-- Atención requerida -->
        <div class="section">
          <div class="section-head">
            <h2>Atención requerida</h2>
            <span class="meta">{{ promotions$ | async | attentionRequiredCount }} promociones en zona de alerta</span>
          </div>
          <div class="attention-grid">
            <ng-container *ngIf="(promotions$ | async) as promotions">
              <ng-container *ngIf="promotions.length > 0; else noAttention">
                <div *ngFor="let promo of promotions | attentionRequired: 3" class="attention-card"
                    [class.amber]="getPromotionStatus(promo) === 'amber'"
                    [class.red]="getPromotionStatus(promo) === 'red'">
                  <div class="head">
                    <div class="name">{{ promo.name }}</div>
                    <span class="pill"
                        [class.amber]="getPromotionStatus(promo) === 'amber'"
                        [class.red]="getPromotionStatus(promo) === 'red'">
                      <span class="dot"></span>
                      {{ getPromotionStatus(promo) === 'red' ? 'Crítico' : 'Alerta' }}
                    </span>
                  </div>
                  <div class="reason">
                    Margen {{ (promo.financials?.projected_margin_pct ?? 0) | number:'1.0-1' }}%
                    {{ getPromotionStatus(promo) === 'red' ? 'fuera de objetivo, revisar costes de construcción y alcance' : 'en zona de vigilancia, monitoring semanal recomendado' }}
                  </div>
                </div>
              </ng-container>
            </ng-container>
          </div>
        </div>

        <!-- Top 5 por margen -->
        <div class="section">
          <div class="card">
            <div class="card-title">Top 5 promociones por margen</div>
            <div class="top-list">
              <ng-container *ngIf="(promotions$ | async) as promotions">
                <div *ngFor="let promo of promotions | topByMargin: 5; let i = index" class="top-item">
                  <span class="rank">#{{ i + 1 }}</span>
                  <div>
                    <div class="name">{{ promo.name }}</div>
                    <div class="city">{{ promo.location.city }}</div>
                  </div>
                  <div class="bar">
                    <span [style.width.%]="getMarginBarWidth(promo, promotions)"></span>
                  </div>
                  <span class="value">{{ (promo.financials?.projected_margin_pct ?? 0) | number:'1.0-1' }}%</span>
                </div>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Actividad reciente -->
        <div class="section">
          <div class="card">
            <div class="card-title">Actividad reciente</div>
            <div class="timeline">
              <div class="timeline-item">
                <div class="when">Hoy</div>
                <div class="dot amber"></div>
                <div class="body"><span class="who">La Marina - Fase 2</span> · Reunión de seguimiento con jefe de proyecto. Avance estructural según plan.</div>
              </div>
              <div class="timeline-item">
                <div class="when">Ayer</div>
                <div class="dot green"></div>
                <div class="body"><span class="who">Mirador del Mar</span> · Aprobación de modificaciones de acabados por parte de comprador clave.</div>
              </div>
              <div class="timeline-item">
                <div class="when">Hace 2d</div>
                <div class="dot amber"></div>
                <div class="body"><span class="who">Los Naranjos</span> · Entregada documentación para solicitud de licencia de obra.</div>
              </div>
              <div class="timeline-item">
                <div class="when">Hace 3d</div>
                <div class="dot green"></div>
                <div class="body"><span class="who">Cala Serena</span> · Avance del 60% en due diligence ambiental del suelo.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  
      <ng-template #noAttention>
        <p>No promotions require attention.</p>
      </ng-template>
    `,
  styles: [`
    .overview-page {
      padding: 2rem;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 1rem;
    }
    .page-description {
      color: var(--ink-secondary);
      margin-bottom: 2rem;
    }
    .skeleton-loader {
      display: grid;
      gap: 1.5rem;
    }
    .kpi-grid-skeleton {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .section-head-skeleton {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
    }
    .attention-grid-skeleton {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
    }
    .attention-card-skeleton,
    .top-item-skeleton,
    .timeline-item-skeleton {
      background-color: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: 0.5rem;
    }
    .attention-card-skeleton {
      padding: 1rem;
    }
    .top-list-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .top-item-skeleton {
      display: grid;
      grid-template-columns: 24px 1fr 100px 60px;
      gap: 0.75rem;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(15, 42, 74, 0.04);
    }
    .top-item-skeleton:last-child { border-bottom: none; }
    .timeline-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .timeline-item-skeleton {
      display: grid;
      grid-template-columns: 80px 8px 1fr;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .overview-content {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .kpi-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 2rem;
    }
    .kpi-card {
      background-color: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: 0.5rem;
      padding: 1rem;
      transition: border-color 150ms ease;
    }
    .kpi-card:hover {
      border-color: var(--border-soft-hover);
    }
    .kpi-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ink);
      letter-spacing: -0.02em;
      display: block;
      font-variant-numeric: tabular-nums;
    }
    .kpi-foot {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--muted);
    }
    .delta {
      font-weight: 600;
      font-size: 0.875rem;
    }
    .delta.pos { color: var(--green); }
    .delta.neg { color: var(--red); }
    .delta.neu { color: var(--text-subtle); }
    .section {
      margin-bottom: 2rem;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
    }
    .section-head h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--ink);
    }
    .section-head .meta {
      font-size: 0.875rem;
      color: var(--muted);
    }
    .attention-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
    }
    .attention-card {
      background-color: var(--surface);
      border: 1px solid var(--border-soft);
      border-left-width: 3px;
      border-radius: 0.5rem;
      padding: 1rem;
      transition: border-color 150ms ease;
      cursor: pointer;
    }
    .attention-card:hover {
      border-color: var(--border-strong);
    }
    .attention-card.amber { border-left-color: var(--amber); }
    .attention-card.red { border-left-color: var(--red); }
    .attention-card .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .attention-card .name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--ink);
    }
    .attention-card .reason {
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.4;
    }
    .top-list {
      display: flex;
      flex-direction: column;
    }
    .top-item {
      display: grid;
      grid-template-columns: 24px 1fr 100px 60px;
      gap: 0.75rem;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(15, 42, 74, 0.04);
    }
    .top-item:last-child { border-bottom: none; }
    .top-item .rank {
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 600;
    }
    .top-item .name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--ink);
    }
    .top-item .city {
      font-size: 0.75rem;
      color: var(--muted);
    }
    .top-item .bar {
      height: 0.5rem;
      background: var(--border-soft);
      border-radius: 9999px;
      overflow: hidden;
    }
    .top-item .bar > span {
      display: block;
      height: 100%;
      background: var(--ink);
      transition: width 300ms ease;
    }
    .top-item .value {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: var(--ink);
      text-align: right;
    }
    .card {
      background-color: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .timeline-item .when {
      width: 5rem;
      font-size: 0.75rem;
      color: var(--muted);
      flex-shrink: 0;
    }
    .timeline-item .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background-color: var(--ink);
      margin-top: 0.375rem;
      flex-shrink: 0;
    }
    .timeline-item .dot.amber { background-color: var(--amber); }
    .timeline-item .dot.green { background-color: var(--green); }
    .timeline-item .body {
      flex: 1;
      font-size: 0.875rem;
      color: var(--ink);
    }
    .timeline-item .who {
      font-weight: 500;
    }
    @media (max-width: 900px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .attention-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 600px) {
      .overview-page {
        padding: 1rem;
      }
      .kpi-grid {
        grid-template-columns: 1fr;
      }
      .attention-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OverviewPageComponent {
  private apiService = inject(API_SERVICE);

  promotions$: Observable<Promotion[]> = this.apiService.listPromotions();

  ngOnInit(): void {
  }

  // Helper methods for template
  getPromotionStatus(promo: Promotion): 'green' | 'amber' | 'red' {
    const marginPct = promo.financials?.projected_margin_pct ?? 0;
    const preVentasPct = promo.unitsTotal > 0 ? (promo.unitsSold ?? 0) / promo.unitsTotal * 100 : 0;
    
    if (marginPct >= 18 && preVentasPct >= 30) {
      return 'green';
    } else if ((marginPct >= 12 && marginPct < 18) || (preVentasPct >= 15 && preVentasPct < 30)) {
      return 'amber';
    } else {
      return 'red';
    }
  }

  getMarginBarWidth(promo: Promotion, allPromotions: Promotion[]): number {
    const margins = allPromotions
      .map(p => p.financials?.projected_margin_pct ?? 0)
      .filter(m => m >= 0);
    const maxMargin = Math.max(...margins);
    const promoMargin = promo.financials?.projected_margin_pct ?? 0;
    return maxMargin > 0 ? (promoMargin / maxMargin) * 100 : 0;
  }
}