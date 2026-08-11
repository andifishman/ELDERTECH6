import { ProviderFatalError, ProviderRateLimitedError, type IProvider } from '../../core/provider';
import type { ChatCompletionInput, ChatCompletionOutput } from './ChatTypes';

const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

/**
 * Tercer vendor de chat, independiente de Groq y de OpenRouter. Existe porque
 * el tier gratuito de Groq son 8000 tokens/minuto para toda la residencia: sin
 * un respaldo real, dos preguntas seguidas dejaban el asistente sin responder.
 *
 * Google expone un endpoint compatible con OpenAI, así que el shape de
 * request/response (incluido tool_calls) es el mismo que Groq/OpenRouter y no
 * hace falta traducir nada — igual que el resto de los providers del módulo.
 */
export class GeminiProvider implements IProvider<ChatCompletionInput, ChatCompletionOutput> {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    readonly tier: number,
  ) {
    this.name = `gemini:${model}`;
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

    const res = await fetch(GEMINI_OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ProviderFatalError(this.name, `Gemini key inválida o sin permisos: ${errText}`);
      }
      // 404 = modelo discontinuado para esta cuenta (ya pasó con gemini-2.5-flash).
      // Es fatal: reintentar el mismo modelo nunca lo va a resolver.
      if (res.status === 404) {
        throw new ProviderFatalError(this.name, `Gemini: el modelo ${this.model} no está disponible: ${errText}`);
      }
      if (res.status === 429 || res.status === 503) {
        throw new ProviderRateLimitedError(this.name, `Gemini ${res.status}: ${errText}`);
      }
      throw new Error(`Gemini (${this.model}) respondió ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: ChatCompletionOutput['message'] }> };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error(`Gemini (${this.model}) no devolvió un mensaje válido.`);
    return { message };
  }
}
