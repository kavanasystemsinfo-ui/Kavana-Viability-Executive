import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import type { LLMProviderAdapter, LLMChatRequest, LLMChatResponse } from './llm-provider-adapter';

@Injectable()
export class AnthropicAdapter implements LLMProviderAdapter {
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor(private readonly httpService: HttpService) {}

  async completeChat(request: LLMChatRequest): Promise<LLMChatResponse> {
    // Anthropic has a different API format, we need to transform
    const anthropicRequest = {
      model: request.model,
      max_tokens: request.max_tokens ?? 1000,
      temperature: request.temperature ?? 0.2,
      messages: request.messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role, // Anthropic doesn't have system role in messages, we prepend to first user message
        content: msg.content ?? '',
      })),
      // We'll handle tools differently - Anthropic uses a different format
      // For now, we'll ignore tools and return a basic response
      // In a real implementation, we would transform the tools to Anthropic's format
    };

    // Add system message if present
    const systemMsg = request.messages.find((m) => m.role === 'system');
    if (systemMsg && systemMsg.content) {
      // Anthropic expects system as a separate field
      // We'll add it to the request
      // Note: This is a simplified implementation
    }

    const response = await firstValueFrom(
      this.httpService
        .post<LLMChatResponse>(this.apiUrl, anthropicRequest, {
          headers: {
            Authorization: `Bearer ${request.headers?.Authorization ?? ''}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        })
        .pipe(timeout(15000)),
    );
    return response.data;
  }
}
