import { Injectable, Logger } from '@nestjs/common';
import { OrquestadorService, UserLlmSettings, ChatResponse } from '../orchestrator/orchestrator.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly orquestadorService: OrquestadorService) {}

  /**
   * Procesa un mensaje del usuario delegando en el OrquestadorService, que
   * resuelve la intención por palabras clave y delega en el motor de
   * viabilidad para los datos reales.
   *
   * @param message El mensaje del usuario en lenguaje natural.
   * @param companyId El ID de la empresa (del middleware).
   * @param userRole El rol del usuario (del guard de auth).
   * @param userSettings Los ajustes LLM del usuario (del servicio de ajustes).
   * @returns Un string (Markdown por defecto) o un objeto estructurado si pidió JSON.
   */
  async procesarMensaje(
    message: string,
    companyId: string,
    userRole: string,
    userSettings: UserLlmSettings,
  ): Promise<string | ChatResponse> {
    this.logger.log(
      `Processing message for companyId: ${companyId}, userRole: ${userRole}, llmProvider: ${userSettings.llmProvider}`,
    );

    return this.orquestadorService.procesarMensaje(message, companyId, userRole, userSettings);
  }
}
