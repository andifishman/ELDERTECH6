import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput } from './ChatTypes';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Respaldo de un vendor DISTINTO a Groq — los 3 GroqModelProvider comparten
 * la misma infraestructura de Groq, así que si Groq como servicio se cae
 * entero (no solo la cuota de un modelo puntual), los tres fallan igual.
 * OpenRouter enruta a modelos alojados en infraestructura separada; API
 * compatible con OpenAI, mismo shape de request/response que Groq.
 */
export class OpenRouterProvider implements IProvider<ChatCompletionInput, ChatCompletionOutput> {
  readonly name = 'openrouter';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    readonly tier: number,
  ) {}

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

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        // Recomendados por OpenRouter para identificar la app — no afecta la funcionalidad si se omiten.
        'HTTP-Referer': 'https://eldertech.app',
        'X-Title': 'ElderTech',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) throw new ProviderFatalError(this.name, `OpenRouter key inválida: ${errText}`);
      if (res.status === 429 || res.status === 503) {
        throw new ProviderRateLimitedError(this.name, `OpenRouter ${res.status}: ${errText}`);
      }
      throw new Error(`OpenRouter (${this.model}) respondió ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: ChatCompletionOutput['message'] }> };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error(`OpenRouter (${this.model}) no devolvió un mensaje válido.`);
    return { message };
  }
}
