import { OrquestadorService, UserLlmSettings } from './orchestrator.service';
import { ViabilityService } from '../viability/viability.service';

describe('OrquestadorService', () => {
  let service: OrquestadorService;
  let viabilityService: ViabilityService;

  const userSettings: UserLlmSettings = {
    llmProvider: 'openrouter',
    modelName: 'google/gemini-flash-1.5', // free model: no rate limiting
    apiKey: 'test-key',
    maxTokensPerDay: 1000,
    maxRequestsPerDay: 100,
  };

  beforeEach(() => {
    viabilityService = new ViabilityService();
    service = new OrquestadorService(viabilityService);
  });

  describe('procesarMensaje: pregunta estrella "promoción más rentable"', () => {
    it('reconoce la pregunta CON acentos (ó/á) y responde con datos reales', async () => {
      const result = await service.procesarMensaje(
        '¿Cuál es la promoción más rentable?',
        'company-1',
        'viewer',
        userSettings,
      );

      // Debe ser un string (no JSON), mencionar la promoción más rentable (Mar, margen 35).
      expect(typeof result).toBe('string');
      const respuesta = result as string;
      expect(respuesta).toContain('Promoción Mar');
      expect(respuesta).toContain('35');
      expect(respuesta).not.toContain('no entiendo');
    });

    it('reconoce la pregunta SIN acentos (cual es la promocion mas rentable)', async () => {
      const result = await service.procesarMensaje(
        'cual es la promocion mas rentable',
        'company-1',
        'viewer',
        userSettings,
      );

      const respuesta = result as string;
      expect(respuesta).toContain('Promoción Mar');
      expect(respuesta).not.toContain('no entiendo');
    });

    it('usa el contrato real de ViabilityService: calcularViabilidadPromocion con 1 argumento', async () => {
      // Espiamos el método real para verificar el contrato de llamada.
      const spy = jest.spyOn(viabilityService, 'calcularViabilidadPromocion');
      jest.spyOn(viabilityService, 'listarPromociones');

      await service.procesarMensaje('cual es la promocion mas rentable', 'company-1', 'viewer', userSettings);

      expect(spy).toHaveBeenCalledTimes(1);
      // Contrato real: un único argumento (promotionId), y es un id real del fixture.
      const arg = spy.mock.calls[0]![0];
      expect(arg).toBe('promo-3');
    });
  });

  describe('procesarMensaje: listar promociones', () => {
    it('lista las 3 promociones reales (Altair, Bahía, Mar)', async () => {
      const result = await service.procesarMensaje(
        'lista las promociones',
        'company-1',
        'viewer',
        userSettings,
      );

      const respuesta = result as string;
      expect(respuesta).toContain('Promoción Altair');
      expect(respuesta).toContain('Promoción Bahía');
      expect(respuesta).toContain('Promoción Mar');
      expect(respuesta).not.toContain('no entiendo');
    });

    it('responde a "dame las promociones"', async () => {
      const result = await service.procesarMensaje('dame las promociones', 'company-1', 'viewer', userSettings);
      const respuesta = result as string;
      expect(respuesta).toContain('Promoción Altair');
    });
  });

  describe('procesarMensaje: formato JSON', () => {
    it('devuelve { respuesta, datos, fuentes } cuando pide formato json', async () => {
      const result = await service.procesarMensaje(
        'dame las promociones en formato json',
        'company-1',
        'viewer',
        userSettings,
      );

      expect(result).toMatchObject({
        respuesta: expect.stringContaining('Promoción Altair'),
        datos: expect.any(Array),
        fuentes: expect.any(Array),
      });
      const json = result as { respuesta: string; datos: any[]; fuentes: string[] };
      expect(json.datos).toHaveLength(3);
      expect(json.fuentes).toContain('motor-viabilidad-determinista');
    });
  });

  describe('procesarMensaje: no entiende', () => {
    it('responde con un mensaje elegante cuando no reconoce la intención', async () => {
      const result = await service.procesarMensaje(
        'cuéntame un chiste de programación',
        'company-1',
        'viewer',
        userSettings,
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('no entiendo');
    });
  });
});
