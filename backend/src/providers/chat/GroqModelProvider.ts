import { ProviderFatalError, ProviderInputError, ProviderRateLimitedError, parseRetryAfterMs, type IProvider } from '../../core/provider';
import { sinCamposDeGemini, type ChatCompletionInput, type ChatCompletionOutput } from './ChatTypes';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Cada modelo de Groq es su propio provider dentro del mismo ProviderManager —
 * reemplaza la clase `RateLimitError` y el loop manual que tenía
 * `asistenteService.ts` en el cliente. El `tier` preserva el orden de calidad
 * en vez de dejar que el desempate por latencia lo reordene.
 */
export class GroqModelProvider implements IProvider<ChatCompletionInput, ChatCompletionOutput> {
  readonly name: string;

  /**
   * @param extraBody Parámetros propios del modelo. Los de razonamiento
   * (gpt-oss, qwen3) piensan antes de contestar y ese "pensamiento" sale del
   * mismo `max_tokens`: sin acotarlo, a veces se lo gastaban entero y
   * devolvían la respuesta vacía.
   */
  constructor(
    private readonly model: string,
    private readonly apiKey: string,
    readonly tier: number,
    private readonly extraBody: Record<string, unknown> = {},
  ) {
    this.name = `groq:${model}`;
  }

  async call(input: ChatCompletionInput): Promise<ChatCompletionOutput> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: sinCamposDeGemini(input.messages),
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens,
      ...this.extraBody,
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
      // 404 = modelo dado de baja o no habilitado para esta cuenta (pasó con
      // llama-3.3-70b y llama-3.1-8b): reintentarlo nunca lo va a resolver.
      if (res.status === 404) throw new ProviderFatalError(this.name, `Groq: el modelo ${this.model} no está disponible: ${errText}`);
      if (res.status === 429 || res.status === 503) {
        // Groq redondea `retry-after` para arriba; el cuerpo trae el valor exacto ("try again in 7.55s").
        const exacto = /try again in ([\d.]+)s/.exec(errText)?.[1];
        throw new ProviderRateLimitedError(
          this.name,
          `Groq ${res.status}: ${errText}`,
          exacto ? Math.ceil(Number(exacto) * 1000) : parseRetryAfterMs(res.headers.get('retry-after')),
        );
      }
      // 400 (p. ej. tool_use_failed: el modelo armó mal una llamada a herramienta)
      // y 413 (pedido más grande que la cuota por minuto): problema de ESTE pedido,
      // no del provider — se pasa al siguiente sin abrir el circuit breaker.
      if (res.status === 400 || res.status === 413) {
        throw new ProviderInputError(this.name, `Groq ${res.status}: ${errText}`);
      }
      throw new Error(`Groq (${this.model}) respondió ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: ChatCompletionOutput['message'] }> };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error(`Groq (${this.model}) no devolvió un mensaje válido.`);
    return { message };
  }
}
