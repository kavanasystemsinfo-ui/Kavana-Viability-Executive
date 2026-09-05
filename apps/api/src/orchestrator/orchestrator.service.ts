import { Injectable, BadRequestException } from '@nestjs/common';
import { ViabilityService } from '../viability/viability.service';
import { esModeloPago } from './utils/esModeloPago';

export interface UserLlmSettings {
  llmProvider: string;
  modelName: string;
  apiKey: string;
  maxTokensPerDay: number;
  maxRequestsPerDay: number;
}

export interface ChatResponse {
  respuesta: string;
  datos: unknown;
  fuentes: string[];
}

/**
 * Orquestador del chatbot KAVANA Viability Executive.
 *
 * Por decisión de negocio (Jorge quiere enseñar el bot como diferenciador
 * con respuesta real y determinista), la lógica de intención es 100% por
 * palabras clave: no depende de ningún LLM externo ni de claves de API.
 * Responde de forma consistente a: "promoción más rentable", "lista las
 * promociones" y peticiones en formato JSON, delegando en ViabilityService.
 */
@Injectable()
export class OrquestadorService {
  // In-memory rate limiting store: Map<companyId, { count: number; day: string }>
  private readonly rateLimitMap = new Map<string, { count: number; day: string }>();

  constructor(private readonly viabilityService: ViabilityService) {}

  /**
   * Normaliza el texto quitando acentos/tildes (es-ES) para que el matching
   * por palabras clave sea robusto: "promoción" y "promocion" son iguales.
   */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /**
   * Procesa un mensaje del usuario devolviendo una respuesta en lenguaje
   * natural (string) o un objeto estructurado si pidió formato JSON.
   */
  async procesarMensaje(
    message: string,
    companyId: string,
    userRole: string,
    userSettings: UserLlmSettings,
  ): Promise<string | ChatResponse> {
    // Limit rate de solicitudes si el modelo configurado es de pago
    const isPaid = esModeloPago(userSettings.modelName);
    if (isPaid) {
      if (!this.allowRequest(companyId, userSettings.maxRequestsPerDay)) {
        throw new BadRequestException(
          `Has superado el límite de ${userSettings.maxRequestsPerDay} solicitudes por día. Por favor, intenta mañana o contacta al administrador.`,
        );
      }
    }

    const normalized = this.normalizar(message);

    // 1) Pregunta estrella: la promoción más rentable
    if (
      normalized.includes('rentable') &&
      (normalized.includes('promocion') || normalized.includes('promo'))
    ) {
      return this.responderMasRentable(companyId, message, userSettings);
    }

    // 2) Listar promociones
    if (
      normalized.includes('listar') ||
      normalized.includes('promociones') ||
      normalized.includes('promo')
    ) {
      return this.responderListar(companyId, userRole, message, userSettings);
    }

    // 3) No se reconoce la intención: respuesta elegante
    const content =
      'Lo siento, no entiendo la pregunta. Por favor, intenta con una de las preguntas soportadas.';
    return this.formatFinalResponse(content, message, userSettings, null);
  }

  private async responderMasRentable(
    companyId: string,
    message: string,
    userSettings: UserLlmSettings,
  ): Promise<string | ChatResponse> {
    const promociones = await this.viabilityService.listarPromociones(companyId, 'viewer');

    if (!promociones.length) {
      return this.formatFinalResponse(
        'No hay promociones disponibles para calcular la viabilidad.',
        message,
        userSettings,
        [],
      );
    }

    const masRentable = promociones.reduce((a, b) =>
      (b.margin ?? 0) > (a.margin ?? 0) ? b : a,
    );

    const resultado = await this.viabilityService.calcularViabilidadPromocion(
      masRentable.promotionId,
    );

    if (resultado?.error) {
      return this.formatFinalResponse(
        `No pude calcular la viabilidad de la promoción: ${resultado.error}`,
        message,
        userSettings,
        resultado,
      );
    }

    const nombre = resultado?.nombre ?? masRentable.name;
    const viable = resultado?.esViable ? 'sí' : 'no';
    const content = `La promoción más rentable es ${nombre} con un margen bruto del ${resultado?.margenBruto}%. Es viable: ${viable}. ${resultado?.recomendacion ?? ''}`.trim();

    return this.formatFinalResponse(content, message, userSettings, resultado);
  }

  private async responderListar(
    companyId: string,
    userRole: string,
    message: string,
    userSettings: UserLlmSettings,
  ): Promise<string | ChatResponse> {
    const promociones = await this.viabilityService.listarPromociones(companyId, userRole);

    if (!promociones.length) {
      return this.formatFinalResponse(
        'No se encontraron promociones para la empresa.',
        message,
        userSettings,
        [],
      );
    }

    const names = promociones.map((p) => p.name).join(', ');
    const content = `Las promociones disponibles son: ${names}.`;

    return this.formatFinalResponse(content, message, userSettings, promociones);
  }

  /**
   * Formatea la respuesta final. Si el usuario pidió explícitamente formato
   * JSON, devuelve un objeto estructurado; en caso contrario un string.
   */
  private formatFinalResponse(
    content: string,
    originalMessage: string,
    userSettings: UserLlmSettings,
    datos: unknown,
  ): string | ChatResponse {
    const normalized = this.normalizar(originalMessage);
    const wantsJson =
      normalized.includes('dame los datos en json') ||
      normalized.includes('formato json') ||
      normalized.includes('output json') ||
      normalized.includes('en json');

    if (!wantsJson) {
      return content;
    }

    return {
      respuesta: content,
      datos: datos ?? {},
      fuentes: [userSettings.llmProvider, 'motor-viabilidad-determinista'],
    };
  }

  /**
   * Permite una solicitud según el límite de peticiones diarias de la empresa.
   */
  private allowRequest(companyId: string, maxRequestsPerDay: number): boolean {
    const today =
      new Date().toISOString().split('T')[0] ?? new Date().toISOString().substring(0, 10);
    const record = this.rateLimitMap.get(companyId);

    if (!record || record.day !== today) {
      this.rateLimitMap.set(companyId, { count: 1, day: today });
      return true;
    }

    if (record.count >= maxRequestsPerDay) {
      return false;
    }

    this.rateLimitMap.set(companyId, { count: record.count + 1, day: today });
    return true;
  }
}
