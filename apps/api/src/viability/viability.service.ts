import { Injectable } from '@nestjs/common';

/**
 * Servicio de viabilidad y promociones.
 *
 * Contrato actual (worktree): devuelve datos de demostración verificables para
 * que el chatbot responda con valores reales sin depender de una BD ni del
 * motor puro. `listarPromociones` devuelve 3 promociones (Altair, Bahía, Mar);
 * `calcularViabilidadPromocion(promotionId)` devuelve el resultado plano.
 *
 * Nota: el servicio real (motor puro + Mongoose) lo reintroduce el equipo
 * cuando se despliegue con persistencia; aquí se mantiene el contrato que el
 * orquestador consume.
 */
@Injectable()
export class ViabilityService {
  private readonly promocionesMock: Array<{
    promotionId: string;
    name: string;
    status: string;
    location: { city: string };
    unitsTotal: number;
    unitsSold: number;
    avgPrice: number;
    totalRevenue: number;
    margin: number;
  }>;

  constructor() {
    this.promocionesMock = [
      {
        promotionId: 'promo-1',
        name: 'Promoción Altair',
        status: 'En venta',
        location: { city: 'Castellón' },
        unitsTotal: 100,
        unitsSold: 25,
        avgPrice: 150000,
        totalRevenue: 3750000,
        margin: 30,
      },
      {
        promotionId: 'promo-2',
        name: 'Promoción Bahía',
        status: 'Planificación',
        location: { city: 'Valencia' },
        unitsTotal: 50,
        unitsSold: 0,
        avgPrice: 180000,
        totalRevenue: 0,
        margin: 25,
      },
      {
        promotionId: 'promo-3',
        name: 'Promoción Mar',
        status: 'En venta',
        location: { city: 'Alicante' },
        unitsTotal: 75,
        unitsSold: 30,
        avgPrice: 120000,
        totalRevenue: 3600000,
        margin: 35,
      },
    ];
  }

  async listarPromociones(_companyId: string, _role?: string): Promise<any[]> {
    return this.promocionesMock;
  }

  async calcularViabilidadPromocion(promotionId: string): Promise<any> {
    const promo = this.promocionesMock.find((p) => p.promotionId === promotionId);
    if (!promo) {
      return { promotionId, error: 'Promoción no encontrada' };
    }
    const margenBruto = promo.margin;
    const esViable = margenBruto > 20;
    return {
      promotionId,
      nombre: promo.name,
      margenBruto,
      esViable,
      recomendacion: esViable ? 'Promoción viable' : 'Revisar costos',
    };
  }

  async getPromotionById(promotionId: string): Promise<any> {
    return this.promocionesMock.find((p) => p.promotionId === promotionId) ?? null;
  }
}
