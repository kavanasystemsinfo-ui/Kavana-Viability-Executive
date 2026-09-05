import { ChatService } from '../chat.service';
import { OrquestadorService, UserLlmSettings } from '../../orchestrator/orchestrator.service';

describe('ChatService', () => {
  let service: ChatService;
  let orquestadorService: { procesarMensaje: jest.Mock };

  const userSettings: UserLlmSettings = {
    llmProvider: 'openrouter',
    modelName: 'google/gemini-flash-1.5',
    apiKey: 'test-key',
    maxTokensPerDay: 1000,
    maxRequestsPerDay: 100,
  };

  beforeEach(() => {
    orquestadorService = { procesarMensaje: jest.fn() };
    service = new ChatService(orquestadorService as unknown as OrquestadorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('procesarMensaje', () => {
    it('delega en OrquestadorService con los mismos argumentos', async () => {
      orquestadorService.procesarMensaje.mockResolvedValue('Respuesta del orquestador');

      const result = await service.procesarMensaje('Hola', 'company-1', 'viewer', userSettings);

      expect(orquestadorService.procesarMensaje).toHaveBeenCalledWith(
        'Hola',
        'company-1',
        'viewer',
        userSettings,
      );
      expect(result).toBe('Respuesta del orquestador');
    });

    it('propaga la respuesta estructurada (JSON) del orquestador', async () => {
      const jsonResponse = {
        respuesta: 'Las promociones son: A, B.',
        datos: [{ name: 'A' }, { name: 'B' }],
        fuentes: ['openrouter', 'motor-viabilidad-determinista'],
      };
      orquestadorService.procesarMensaje.mockResolvedValue(jsonResponse);

      const result = await service.procesarMensaje('dame las promociones en json', 'c1', 'viewer', userSettings);

      expect(result).toEqual(jsonResponse);
    });

    it('propaga errores del orquestador (p. ej. límite de peticiones)', async () => {
      orquestadorService.procesarMensaje.mockRejectedValue(new Error('Has superado el límite'));

      await expect(
        service.procesarMensaje('cual es la promocion mas rentable', 'c1', 'viewer', userSettings),
      ).rejects.toThrow('Has superado el límite');
    });
  });
});
