import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import type { LLMProviderAdapter, LLMChatRequest, LLMChatResponse } from './llm-provider-adapter';

@Injectable()
export class OpenRouterAdapter implements LLMProviderAdapter {
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly httpService: HttpService) {}

  async completeChat(request: LLMChatRequest): Promise<LLMChatResponse> {
    const response = await firstValueFrom(
      this.httpService
        .post<LLMChatResponse>(this.apiUrl, request, {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(timeout(15000)),
    );
    return response.data;
  }
}
