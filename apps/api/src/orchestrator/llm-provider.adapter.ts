export interface LLMProviderAdapter {
  chatCompletion(messages: unknown[], tools: unknown[]): Promise<unknown>;
}
