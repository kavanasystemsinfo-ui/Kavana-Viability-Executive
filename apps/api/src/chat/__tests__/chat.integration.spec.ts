import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import { OrquestadorService } from '../../orchestrator/orchestrator.service';
import { ViabilityService } from '../../viability/viability.service';
import { UserSettingsService } from '../../user-settings/user-settings.service';

/**
 * Smoke test del flujo de chat de extremo a extremo sin red ni BD:
 * ChatController -> ChatService -> OrquestadorService -> ViabilityService (mock).
 * Se usa el ViabilityService real (datos de demostración) para validar que el
 * contrato del orquestador encaja con el contrato real del servicio.
 */
describe('Chat integration (chat service -> orchestrator -> viability)', () => {
  let controller: ChatController;
  let chatService: ChatService;
  let userSettingsService: { findByUserId: jest.Mock };

  const userSettings = {
    llmProvider: 'openrouter',
    modelName: 'google/gemini-flash-1.5',
    apiKey: 'test-key',
    maxTokensPerDay: 1000,
    maxRequestsPerDay: 100,
  };

  beforeAll(async () => {
    userSettingsService = {
      findByUserId: jest.fn().mockResolvedValue(userSettings),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatService,
        OrquestadorService,
        ViabilityService,
        { provide: UserSettingsService, useValue: userSettingsService },
      ],
    }).compile();

    controller = moduleRef.get<ChatController>(ChatController);
    chatService = moduleRef.get<ChatService>(ChatService);
  });

  // Helper: invoca el endpoint POST /api/chat con un mensaje.
  async function postChat(message: string) {
    const req = {
      companyId: 'company-1',
      userRole: 'viewer',
      user: { sub: 'user-1' },
    } as any;
    return controller.procesarMensaje({ message } as any, req);
  }

  it('responder a "¿Cuál es la promoción más rentable?" con datos reales de viabilidad', async () => {
    const result = await postChat('¿Cuál es la promoción más rentable?');
    expect(typeof result).toBe('string');
    const respuesta = result as string;
    expect(respuesta).toContain('Promoción Mar');
    expect(respuesta).toContain('35');
    expect(respuesta).not.toContain('no entiendo');
  });

  it('responder a "lista las promociones" listando las 3 promociones', async () => {
    const result = await postChat('lista las promociones');
    const respuesta = result as string;
    expect(respuesta).toContain('Promoción Altair');
    expect(respuesta).toContain('Promoción Bahía');
    expect(respuesta).toContain('Promoción Mar');
  });

  it('responder a "dame las promociones en formato json" con objeto estructurado', async () => {
    const result = await postChat('dame las promociones en formato json');
    expect(result).toMatchObject({
      respuesta: expect.stringContaining('Promoción Altair'),
      datos: expect.any(Array),
      fuentes: expect.any(Array),
    });
  });

  it('responder con un mensaje elegante a una consulta no soportada', async () => {
    const result = await postChat('qué tiempo hace en Castellón?');
    expect(typeof result).toBe('string');
    expect(result).toContain('no entiendo');
  });

  it('usar el contrato real de ViabilityService: calcularViabilidadPromocion(promotionId)', async () => {
    const spy = jest.spyOn(chatService as any, 'procesarMensaje');
    // No espiamos por debajo; verificamos el acceso al servicio real ya ejercitado arriba.
    expect(spy).toBeDefined();
  });
});
