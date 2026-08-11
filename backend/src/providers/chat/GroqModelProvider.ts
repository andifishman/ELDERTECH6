import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput } from './ChatTypes';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Cada modelo de Groq es su propio provider dentro del mismo ProviderManager —
 * reemplaza la clase `RateLimitError` y el loop manual que tenía
 * `asistenteService.ts` en el cliente. El `tier` preserva el orden de calidad
 * original (70B primero) en vez de dejar que el desempate por latencia lo reordene.
 */
export class GroqModelProvider implements IProvider<ChatCompletionInput, ChatCompletionOutput> {
  readonly name: string;

  constructor(
    private readonly model: string,
    private readonly apiKey: string,
    readonly tier: number,
  ) {
    this.name = `groq:${model}`;
  }

  async call(input: ChatCompletionInput): Promise<ChatCompletionOutput> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
    };
    if (input.tools) {
      body.tools = input.tools;
      body.tool_choice = input.toolChoice ?? 'auto';
    }

    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) throw new ProviderFatalError(this.name, `Groq key inválida o expirada: ${errText}`);
      if (res.status === 429 || res.status === 503) {
        throw new ProviderRateLimitedError(this.name, `Groq ${res.status}: ${errText}`);
      }
      throw new Error(`Groq (${this.model}) respondió ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: ChatCompletionOutput['message'] }> };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error(`Groq (${this.model}) no devolvió un mensaje válido.`);
    return { message };
  }
}
