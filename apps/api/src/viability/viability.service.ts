import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Model } from 'mongoose';
import { calcularViabilidad } from '@kavana-viability-executive/viability-engine';
import type { ViabilityResult } from '@kavana-viability-executive/viability-engine';
import { promocionDocToViabilityInput } from './promotion.mapper';
import { Promotion } from './promotion.schema';
import { ViabilityRun } from './viability-run.schema';

export interface PromocionResumen {
  promotionId: string;
  name: string;
  status: string | undefined;
  city: string | undefined;
  unitsTotal: number;
  unitsSold: number | undefined;
}

export interface ResultadoViabilidadPromocion {
  promotionId: string;
  companyId: string;
  resultado: ViabilityResult;
  fechaCorte?: string;
}

export interface OpcionesCalculo {
  fechaCorte?: string;
  umbralMarginBrutoMinPct?: number;
}

/**
 * Conecta la persistencia (promociones en MongoDB) con el motor de viabilidad
 * puro. El motor no conoce la BD; este servicio traduce, calcula y guarda el
 * histórico de cada cálculo en viability_runs.
 */
@Injectable()
export class ViabilityService {
  private readonly logger = new Logger(ViabilityService.name);

  constructor(
    @InjectModel(Promotion.name) private readonly promotionModel: Model<Promotion>,
    @InjectModel(ViabilityRun.name) private readonly viabilityRunModel: Model<ViabilityRun>,
  ) {}

  async listarPromociones(companyId: string): Promise<PromocionResumen[]> {
    const docs = await this.promotionModel.find({ companyId }).sort({ name: 1 }).lean().exec();
    return docs.map((d) => ({
      promotionId: d.promotionId,
      name: d.name,
      status: d.status,
      city: d.location?.city,
      unitsTotal: d.unitsTotal,
      unitsSold: d.unitsSold,
    }));
  }

  async calcularViabilidadPromocion(
    companyId: string,
    promotionId: string,
    opciones?: OpcionesCalculo,
  ): Promise<ResultadoViabilidadPromocion> {
    const promocion = await this.promotionModel.findOne({ companyId, promotionId }).exec();
    if (!promocion) {
      throw new NotFoundException(
        `Promoción ${promotionId} no encontrada para la empresa ${companyId}`,
      );
    }

    const inputBase = promocionDocToViabilityInput(promocion);
    const input = opciones?.fechaCorte
      ? { ...inputBase, fechaCorte: opciones.fechaCorte }
      : inputBase;

    // Umbral configurable por petición; NaN o ausente => default del motor (18%).
    const umbral = opciones?.umbralMarginBrutoMinPct;
    const umbrales =
      umbral !== undefined && !Number.isNaN(umbral) ? { margenBrutoMinPct: umbral } : undefined;

    const resultado = calcularViabilidad(input, umbrales);

    await this.viabilityRunModel.create({
      companyId,
      promotionId,
      input,
      resultado,
      fechaCorte: opciones?.fechaCorte,
    });

    this.logger.log(
      `Viabilidad calculada y guardada: ${companyId}/${promotionId} (margen ${resultado.marginBrutoPct}%)`,
    );

    return {
      promotionId,
      companyId,
      resultado,
      ...(opciones?.fechaCorte ? { fechaCorte: opciones.fechaCorte } : {}),
    };
  }
}
