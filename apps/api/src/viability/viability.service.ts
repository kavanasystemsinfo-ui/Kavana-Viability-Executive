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

  /**
   * Devuelve el resumen de todas las promociones de la empresa, ordenadas por nombre.
   *
   * @param companyId - Identificador de la empresa (multi-tenant).
   * @returns Array de `PromocionResumen` con identificador, nombre, estado,
   *   ciudad y unidades (totales y vendidas si están registradas).
   */
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

  /**
   * Carga la promoción, calcula su viabilidad con el motor puro y persiste el resultado.
   *
   * @param companyId - Identificador de la empresa (multi-tenant).
   * @param promotionId - Identificador de la promoción dentro de la empresa.
   * @param opciones - (Opcional) overrides para este cálculo:
   *   - `fechaCorte`: fecha ISO a aplicar sobre el input del documento.
   *   - `umbralMarginBrutoMinPct`: umbral de margen bruto mínimo (%). Si falta
   *     o es `NaN`, se usa el default del motor.
   * @returns `ResultadoViabilidadPromocion` con el resultado del motor y, si
   *   se aplicó, la `fechaCorte`. El cálculo queda también registrado en
   *   `viability_runs` para auditoría.
   * @throws NotFoundException si la promoción no existe para esa empresa.
   */
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
    // La fechaCorte del query tiene prioridad sobre la que el mapper derive
    // del documento: refleja la voluntad del usuario para este cálculo.
    const input = opciones?.fechaCorte
      ? { ...inputBase, fechaCorte: opciones.fechaCorte }
      : inputBase;

    // Umbral configurable por petición; NaN o ausente => default del motor (18%).
    const umbral = opciones?.umbralMarginBrutoMinPct;
    const umbrales =
      umbral !== undefined && !Number.isNaN(umbral) ? { margenBrutoMinPct: umbral } : undefined;

    const resultado = calcularViabilidad(input, umbrales);

    // Persistimos siempre, incluso si el motor marca no viable: el histórico
    // de runs es lo que permite auditar y comparar cálculos en el tiempo.
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
