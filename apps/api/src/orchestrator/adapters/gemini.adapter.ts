import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import type { LLMProviderAdapter, LLMChatRequest, LLMChatResponse } from './llm-provider-adapter';

@Injectable()
export class GeminiAdapter implements LLMProviderAdapter {
  private readonly apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly httpService: HttpService) {}

  async completeChat(request: LLMChatRequest): Promise<LLMChatResponse> {
    // Gemini API format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    // We need to transform the request to Gemini's format.
    // For simplicity, we'll assume the model is already in the format expected by Gemini (e.g., 'gemini-pro')
    // and we'll build the URL accordingly.

    const url = `${this.apiUrl}/${request.model}:generateContent?key=${request.headers?.Authorization?.split('Bearer ')[1] ?? ''}`;

    // Transform messages to Gemini's format
    const geminiRequest = {
      contents: request.messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role, // Gemini doesn't have system role, we treat as user
        parts: [{ text: msg.content ?? '' }],
      })),
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.max_tokens ?? 1000,
      },
      // We'll ignore tools for now, as Gemini's function calling is different and we'd need to transform.
      // In a real implementation, we would transform the tools to Gemini's function declarations.
    };

    const response = await firstValueFrom(
      this.httpService
        .post<LLMChatResponse>(url, geminiRequest, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .pipe(timeout(15000)),
    );
    return response.data;
  }
}
