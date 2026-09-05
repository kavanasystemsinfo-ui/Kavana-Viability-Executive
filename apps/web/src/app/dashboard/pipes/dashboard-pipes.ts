import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import type { Promotion } from '../../core/api/api.types';

@Pipe({
  name: 'totalRevenue',
  pure: true,
})
export class TotalRevenuePipe implements PipeTransform {
  transform(promotions: Promotion[] | null): string {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return '0 €';
    const total = promotionsArray.reduce((sum, p) => {
      const revenue = p.financials?.revenue_contracted_eur ?? 0;
      return sum + revenue;
    }, 0);
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(total);
  }
}

@Pipe({
  name: 'avgMarginPct',
  pure: true,
})
export class AvgMarginPctPipe implements PipeTransform {
  transform(promotions: Promotion[] | null): number {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return 0;
    const totalWeighted = promotionsArray.reduce((sum, p) => {
      const margin = p.financials?.projected_margin_pct ?? 0;
      const revenue = p.financials?.revenue_contracted_eur ?? 0;
      return sum + margin * revenue;
    }, 0);
    const totalRevenue = promotionsArray.reduce(
      (sum, p) => sum + (p.financials?.revenue_contracted_eur ?? 0),
      0,
    );
    return totalRevenue > 0 ? totalWeighted / totalRevenue : 0;
  }
}

@Pipe({
  name: 'presalesRate',
  pure: true,
})
export class PresalesRatePipe implements PipeTransform {
  transform(promotions: Promotion[] | null): number {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return 0;
    const totalUnits = promotionsArray.reduce((sum, p) => sum + (p.unitsTotal ?? 0), 0);
    const totalSold = promotionsArray.reduce((sum, p) => sum + (p.unitsSold ?? 0), 0);
    return totalUnits > 0 ? (totalSold / totalUnits) * 100 : 0;
  }
}

@Pipe({
  name: 'avgVelocity',
  pure: true,
})
export class AvgVelocityPipe implements PipeTransform {
  transform(promotions: Promotion[] | null): number {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return 0;
    const activePromos = promotionsArray.filter(
      (p) => (p.unitsSold ?? 0) > 0 && p.status?.toLowerCase().includes('ejecución'),
    );
    if (activePromos.length === 0) return 0;
    const totalVelocity = activePromos.reduce((sum, p) => {
      const months = 18; // asumimos horizonte de 18 meses para cálculo
      const velocity = (p.unitsSold ?? 0) / months;
      return sum + velocity;
    }, 0);
    return totalVelocity / activePromos.length;
  }
}

@Pipe({
  name: 'attentionRequiredCount',
  pure: true,
})
export class AttentionRequiredCountPipe implements PipeTransform {
  transform(promotions: Promotion[] | null): number {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return 0;
    return promotionsArray.filter((p) => this.isAttentionRequired(p)).length;
  }

  private isAttentionRequired(promo: Promotion): boolean {
    const marginPct = promo.financials?.projected_margin_pct ?? 0;
    const preVentasPct =
      promo.unitsTotal > 0 ? ((promo.unitsSold ?? 0) / promo.unitsTotal) * 100 : 0;
    return marginPct < 12 || preVentasPct < 15;
  }
}

@Pipe({
  name: 'attentionRequired',
  pure: true,
})
export class AttentionRequiredPipe implements PipeTransform {
  transform(promotions: Promotion[] | null, limit: number = 3): Promotion[] {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return [];
    return promotionsArray
      .filter((p) => this.isAttentionRequired(p))
      .sort((a, b) => {
        const marginA = a.financials?.projected_margin_pct ?? 0;
        const marginB = b.financials?.projected_margin_pct ?? 0;
        return marginA - marginB; // ascending: worst first
      })
      .slice(0, limit);
  }

  private isAttentionRequired(promo: Promotion): boolean {
    const marginPct = promo.financials?.projected_margin_pct ?? 0;
    const preVentasPct =
      promo.unitsTotal > 0 ? ((promo.unitsSold ?? 0) / promo.unitsTotal) * 100 : 0;
    return marginPct < 12 || preVentasPct < 15;
  }
}

@Pipe({
  name: 'topByMargin',
  pure: true,
})
export class TopByMarginPipe implements PipeTransform {
  transform(promotions: Promotion[] | null, limit: number = 5): Promotion[] {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return [];
    return [...promotionsArray]
      .sort((a, b) => {
        const marginA = a.financials?.projected_margin_pct ?? 0;
        const marginB = b.financials?.projected_margin_pct ?? 0;
        return marginB - marginA; // descending: best first
      })
      .slice(0, limit);
  }
}

@Pipe({
  name: 'promotionsCount',
  pure: true,
})
export class PromotionsCountPipe implements PipeTransform {
  transform(promotions: Promotion[] | null, param: string = 'total'): number {
    const promotionsArray = promotions || [];
    if (promotionsArray.length === 0) return 0;
    if (param === 'total') {
      return promotionsArray.length;
    }
    // Add other counts if needed in the future
    return promotionsArray.length;
  }
}
