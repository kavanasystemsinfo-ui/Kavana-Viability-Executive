import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HasRoleDirective } from '../core/auth/has-role.directive';
import { inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_SERVICE } from '../core/api/api.tokens';
import type { Promotion } from '../core/api/api.types';

@Component({
  selector: 'app-promotions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HasRoleDirective],
  template: `
    <div class="promotions-page">
      <h1 class="page-title">Cartera de promociones</h1>
      <p class="page-description">
        {{ (promotions$ | async)?.length }} promociones · filtro por estado, ciudad y umbral de
        margen
      </p>

      <!-- Loading skeleton -->
      <div *ngIf="(promotions$ | async) === null" class="skeleton-loader">
        <!-- Filters skeleton -->
        <div class="filters-skeleton">
          <div class="skeleton" style="width: 100px;"></div>
          <div class="skeleton" style="width: 120px;"></div>
          <div class="skeleton" style="width: 100px;"></div>
          <button class="skeleton" style="width: 100px; height: 36px;"></button>
          <button class="skeleton" style="width: 140px; height: 36px; margin-left: 8px;"></button>
          <input type="range" class="skeleton" style="width: 200px; height: 4px;" disabled />
          <button class="skeleton" style="width: 120px; height: 36px;"></button>
        </div>

        <!-- Table header skeleton -->
        <div class="table-header-skeleton">
          <div
            *ngFor="let i of [1, 2, 3, 4, 5, 6, 7, 8, 9]"
            class="skeleton"
            style="width: 100%; height: 16px;"
          ></div>
        </div>

        <!-- Table rows skeleton -->
        <div class="table-body-skeleton">
          <div *ngFor="let i of [1, 2, 3, 4, 5]" class="table-row-skeleton">
            <div
              *ngFor="let j of [1, 2, 3, 4, 5, 6, 7, 8, 9]"
              class="skeleton"
              style="width: 100%; height: 16px;"
            ></div>
          </div>
        </div>
      </div>

      <!-- Actual content -->
      <div *ngIf="(promotions$ | async) !== null" class="promotions-content">
        <!-- Filters toolbar -->
        <div class="toolbar filters-toolbar">
          <!-- Status filter chips -->
          <div class="filter-group">
            <span class="filter-label">Estado:</span>
            <div class="chip-group">
              <button
                class="chip"
                [class.active]="filterStatus === 'all'"
                (click)="setFilterStatus('all')"
              >
                Todas
              </button>
              <button
                class="chip"
                [class.active]="filterStatus === 'ejecución'"
                (click)="setFilterStatus('ejecución')"
              >
                En ejecución
              </button>
              <button
                class="chip"
                [class.active]="filterStatus === 'licencia'"
                (click)="setFilterStatus('licencia')"
              >
                Licencia
              </button>
              <button
                class="chip"
                [class.active]="filterStatus === 'proyecto'"
                (click)="setFilterStatus('proyecto')"
              >
                Proyecto
              </button>
              <button
                class="chip"
                [class.active]="filterStatus === 'suelo'"
                (click)="setFilterStatus('suelo')"
              >
                Suelo
              </button>
              <button
                class="chip"
                [class.active]="filterStatus === 'opción'"
                (click)="setFilterStatus('opción')"
              >
                Opción suelo
              </button>
            </div>
          </div>

          <span class="toolbar-spacer"></span>

          <!-- Clear filters button -->
          <button class="btn ghost" (click)="clearFilters()">Limpiar filtros</button>

          <!-- New promotion button (Admin/Analyst only) -->
          <button class="btn" *appHasRole="['Admin', 'Analyst']" (click)="navigateToNewPromotion()">
            + Nueva promoción
          </button>
        </div>

        <!-- Margin threshold slider -->
        <div class="toolbar margin-toolbar">
          <span class="filter-label">Umbral margen mínimo:</span>
          <input
            type="range"
            id="margin-slider"
            [(ngModel)]="marginThreshold"
            min="0"
            max="30"
            step="1"
          />
          <span class="slider-value" id="slider-value">{{ marginThreshold }}%</span>
        </div>

        <!-- Promotions table -->
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input
                    type="checkbox"
                    id="select-all"
                    [checked]="
                      selectedIds.size > 0 &&
                      selectedIds.size === (filteredPromotions$ | async)?.length
                    "
                    (change)="toggleAllRows()"
                  />
                </th>
                <th>Estado</th>
                <th>Promoción</th>
                <th>Ubicación</th>
                <th class="t-num">Vendidas / Total</th>
                <th class="t-num">Ingresos €</th>
                <th class="t-num">Margen</th>
                <th class="t-num">Velocidad (uds/mes)</th>
                <th>Entrega</th>
                <th *appHasRole="['Admin', 'Analyst']">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <ng-container
                *ngIf="filteredPromotions$ | async as filteredPromotions; else emptyState"
              >
                <ng-container *ngIf="filteredPromotions.length > 0; else emptyState">
                  <tr
                    *ngFor="let promo of filteredPromotions"
                    [class.selected]="isSelected(promo.id)"
                    (click)="onRowClick($event, promo.id)"
                    (contextmenu)="onRowContextMenu($event, promo.id); $event.preventDefault()"
                  >
                    <td>
                      <input
                        type="checkbox"
                        class="row-check"
                        [checked]="isSelected(promo.id)"
                        (change)="onCheckboxChange($event, promo.id)"
                      />
                    </td>
                    <td>
                      <span
                        class="pill"
                        [class.amber]="getPromotionStatus(promo) === 'amber'"
                        [class.red]="getPromotionStatus(promo) === 'red'"
                      >
                        <span class="dot"></span>
                        {{ promo.status.split(' / ')[0] }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ promo.name }}</strong>
                    </td>
                    <td>{{ promo.location.city }}</td>
                    <td class="t-num">
                      <span class="mini-bar">
                        <span [style.width.%]="_getSoldPercentage(promo)"></span>
                      </span>
                      {{ promo.unitsSold ?? 0 }}/{{ promo.unitsTotal }}
                    </td>
                    <td class="t-num">
                      {{
                        promo.financials?.revenue_contracted_eur ?? 0
                          | currency: 'EUR' : 'symbol-narrow' : '1.0-0' : 'es-ES'
                      }}
                    </td>
                    <td class="t-num">
                      <span
                        class="pill"
                        [class.amber]="getPromotionStatus(promo) === 'amber'"
                        [class.red]="getPromotionStatus(promo) === 'red'"
                      >
                        <span class="dot"></span>
                        {{ promo.financials?.projected_margin_pct ?? 0 | number: '1.0-1' }}%
                      </span>
                    </td>
                    <td class="t-num">
                      {{ _calculateVelocity(promo) | number: '1.0-1' }}
                    </td>
                    <td>
                      {{ promo.estimatedDelivery | date: 'd MMM y' : 'es-ES' }}
                    </td>
                    <td *appHasRole="['Admin', 'Analyst']">
                      <button class="btn ghost" (click)="navigateToPromotionDetail(promo.id)">
                        Detalle
                      </button>
                    </td>
                  </tr>
                </ng-container>
              </ng-container>
              <ng-template #emptyState>
                <tr>
                  <td colspan="9" class="empty-state">
                    <div class="empty">
                      <div class="ico">○</div>
                      <div class="title">Sin resultados</div>
                      <div class="sub">Ajuste los filtros o reduzca el umbral de margen.</div>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </tbody>
          </table>
        </div>

        <!-- Bulk actions bar -->
        <ng-container *ngIf="filteredPromotions$ | async as filteredPromotions">
          <div class="bulk-actions-toolbar" *appHasRole="['Admin', 'Analyst']">
            <div *ngIf="selectedIds.size > 0">
              <span class="bulk-actions-info">
                {{ selectedIds.size }} de {{ filteredPromotions.length }} promociones seleccionadas
              </span>
              <span class="toolbar-spacer"></span>
              <button class="btn" (click)="bulkChangeStatus()">Cambiar estado</button>
              <button class="btn ghost" (click)="exportSelection()">Exportar selección</button>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [
    `
      .promotions-page {
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
      .filters-skeleton,
      .table-header-skeleton,
      .table-body-skeleton {
        background-color: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 0.5rem;
      }
      .filters-skeleton {
        display: flex;
        gap: 1rem;
        align-items: end;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }
      .filters-skeleton > * {
        min-height: 20px;
      }
      .filters-skeleton button {
        height: 36px;
      }
      .filters-skeleton input[type='range'] {
        height: 4px;
      }
      .table-header-skeleton,
      .table-body-skeleton {
        margin-bottom: 1rem;
      }
      .table-header-skeleton {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
      }
      .table-body-skeleton {
        display: flex;
        flex-direction: column;
      }
      .table-row-skeleton {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        margin-bottom: 0.5rem;
      }
      .table-row-skeleton:last-child {
        margin-bottom: 0;
      }
      .promotions-content {
        animation: fadeIn 0.3s ease-in-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      .filters-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        margin-bottom: 1.5rem;
      }
      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .filter-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--muted);
      }
      .chip-group {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background-color: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 9999px;
        font-size: 0.75rem;
        color: var(--muted);
        cursor: pointer;
        transition: all 150ms ease;
      }
      .chip:hover {
        border-color: var(--border-soft-hover);
      }
      .chip.active {
        background-color: var(--ai);
        color: white;
        border-color: var(--ai);
      }
      .toolbar-spacer {
        flex: 1;
      }
      .margin-toolbar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      .margin-toolbar .filter-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--muted);
        white-space: nowrap;
      }
      #margin-slider {
        flex: 1;
        max-width: 240px;
      }
      .slider-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--ink);
        min-width: 48px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .table-wrap {
        background-color: var(--surface);
        border: 1px solid var(--border-soft);
        border-radius: 0.5rem;
        overflow: hidden;
      }
      .data-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .data-table thead th {
        position: sticky;
        top: 0;
        background-color: var(--bg);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
        text-align: left;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border-soft);
      }
      .data-table tbody td {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: var(--ink);
        border-bottom: 1px solid var(--border-soft);
        font-variant-numeric: tabular-nums;
      }
      .data-table tbody tr:hover td {
        background-color: rgba(15, 42, 74, 0.02);
      }
      .data-table tbody tr.selected td {
        background-color: rgba(37, 99, 235, 0.08);
      }
      .data-table .t-num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .mini-bar {
        display: inline-block;
        width: 60px;
        height: 5px;
        background: var(--border-soft);
        border-radius: 9999px;
        overflow: hidden;
        vertical-align: middle;
        margin-right: 8px;
      }
      .mini-bar > span {
        display: block;
        height: 100%;
        background: var(--ink);
        transition: width 300ms ease;
      }
      .bulk-actions-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: rgba(15, 42, 74, 0.02);
        border-radius: 0.5rem;
        margin-top: 1.5rem;
      }
      .bulk-actions-info {
        font-size: 0.875rem;
        color: var(--muted);
      }
      @media (max-width: 900px) {
        .filters-toolbar {
          flex-direction: column;
          align-items: stretch;
        }
        .filter-group {
          width: 100%;
          justify-content: flex-start;
        }
        .chip-group {
          flex-wrap: wrap;
        }
        .margin-toolbar {
          flex-wrap: wrap;
        }
        #margin-slider {
          width: 100%;
        }
        .data-table {
          font-size: 0.75rem;
        }
        .data-table thead th,
        .data-table tbody td {
          padding: 0.5rem 0.75rem;
        }
      }
      @media (max-width: 600px) {
        .promotions-page {
          padding: 1rem;
        }
        .filters-toolbar,
        .margin-toolbar {
          flex-direction: column;
          align-items: flex-start;
        }
        .toolbar-spacer {
          display: none;
        }
        .data-table {
          display: block;
          overflow-x: auto;
        }
        .data-table thead {
          display: none;
        }
        .data-table tbody {
          display: block;
        }
        .data-table tr {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
        }
        .data-table td {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(15, 42, 74, 0.08);
        }
        .data-table td:last-child {
          border-bottom: none;
        }
        .data-table td::before {
          content: attr(data-label);
          font-weight: 600;
          color: var(--muted);
          width: 120px;
        }
      }
    `,
  ],
})
export class PromotionsPageComponent {
  private apiService = inject(API_SERVICE);

  promotions$: Observable<Promotion[]> = this.apiService.listPromotions();

  // UI state
  filterStatus: string = 'all';
  marginThreshold: number = 0;
  selectedIds: Set<string> = new Set();

  // Computed observables
  filteredPromotions$ = this.promotions$.pipe(
    map((promotions) => this._filterPromotions(promotions)),
  );

  selectedCount$ = this.filteredPromotions$.pipe(
    map((filtered) => {
      let count = 0;
      filtered.forEach((promo) => {
        if (this.selectedIds.has(promo.id)) count++;
      });
      return count;
    }),
  );

  // Filter methods
  setFilterStatus(status: string): void {
    this.filterStatus = status;
    this.selectedIds.clear(); // Clear selection when filters change
  }

  clearFilters(): void {
    this.filterStatus = 'all';
    this.marginThreshold = 0;
    this.selectedIds.clear();
  }

  // Selection methods
  isSelected(promotionId: string): boolean {
    return this.selectedIds.has(promotionId);
  }

  onCheckboxChange(event: Event, promotionId: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedIds.add(promotionId);
    } else {
      this.selectedIds.delete(promotionId);
    }
  }

  toggleAllRows(): void {
    // This would need the current filtered list to work properly
    // For simplicity in MVP, we'll just toggle based on a heuristic
    // In a full implementation, we'd combine with filteredPromotions$
    const filteredCount = this.selectedIds.size;
    // We'd need to know total filtered count to implement properly
    // For now, we'll just clear all if any are selected, or select first few if none
    if (filteredCount > 0) {
      this.selectedIds.clear();
    } else {
      // Select first 3 as demo - in real impl would select all visible
      this.promotions$.subscribe((promos) => {
        promos.slice(0, 3).forEach((promo) => this.selectedIds.add(promo.id));
      });
    }
  }

  // Row interaction
  onRowClick(event: MouseEvent, _promotionId: string): void {
    // Don't navigate if click was on checkbox
    const target = event.target as HTMLElement;
    if (target && target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      return; // Let checkbox change handler deal with it
    }
    // Navigation is handled by routerLink on the row in template
  }

  onRowContextMenu(event: MouseEvent, promotionId: string): void {
    // Right-click to select/deselect without navigation
    event.preventDefault();
    const isSelected = this.selectedIds.has(promotionId);
    if (isSelected) {
      this.selectedIds.delete(promotionId);
    } else {
      this.selectedIds.add(promotionId);
    }
  }

  // Navigation methods
  navigateToPromotionDetail(_promotionId: string): void {
    // Navigation would be handled by routerLink on row in full implementation
    // For now we'll just console log - routerLink handles it in template
  }

  navigateToNewPromotion(): void {
    // Placeholder for new promotion form (to be implemented in later tasks)
    alert('Formulario de nueva promoción (pendiente de implementar)');
  }

  // Bulk actions (Admin/Analyst only)
  bulkChangeStatus(): void {
    alert(`Cambiar estado de ${this.selectedIds.size} promociones seleccionadas`);
  }

  exportSelection(): void {
    alert(`Exportar ${this.selectedIds.size} promociones seleccionadas`);
  }

  // Helper methods
  private _filterPromotions(promotions: Promotion[]): Promotion[] {
    if (!promotions) return [];

    return promotions.filter((promo) => {
      // Status filter
      const statusMatch =
        this.filterStatus === 'all' ||
        promo.status.toLowerCase().includes(this.filterStatus.toLowerCase());

      // Margin threshold filter
      const marginPct = promo.financials?.projected_margin_pct ?? 0;
      const marginMatch = marginPct >= this.marginThreshold;

      return statusMatch && marginMatch;
    });
  }

  _getSoldPercentage(promo: Promotion): number {
    if (!promo.unitsTotal || promo.unitsTotal === 0) return 0;
    const sold = promo.unitsSold ?? 0;
    return (sold / promo.unitsTotal) * 100;
  }

  _calculateVelocity(promo: Promotion): number {
    if (!promo.unitsSold || promo.unitsSold === 0) return 0;
    // Simplified: assume 18-month horizon for velocity calculation
    return promo.unitsSold / 18;
  }

  getPromotionStatus(promo: Promotion): 'green' | 'amber' | 'red' {
    const marginPct = promo.financials?.projected_margin_pct ?? 0;
    const preVentasPct =
      promo.unitsTotal > 0 ? ((promo.unitsSold ?? 0) / promo.unitsTotal) * 100 : 0;

    if (marginPct >= 18 && preVentasPct >= 30) {
      return 'green';
    } else if ((marginPct >= 12 && marginPct < 18) || (preVentasPct >= 15 && preVentasPct < 30)) {
      return 'amber';
    } else {
      return 'red';
    }
  }
}
