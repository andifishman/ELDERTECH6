export interface ChatCompletionInput {
  messages: Array<Record<string, unknown>>;
  maxTokens: number;
  tools?: unknown;
  toolChoice?: unknown;
  /** Default 0.7. Se baja para respuestas factuales — a 0.7 el modelo "completa" huecos inventando detalles. */
  temperature?: number;
}

export interface GroqToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
  /** Solo Gemini: `{ google: { thought_signature } }`, que hay que reenviarle tal cual. */
  extra_content?: Record<string, unknown>;
}

/** Los vendors que no son Gemini pueden rechazar el campo `extra_content` en el historial. */
export function sinCamposDeGemini(messages: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return messages.map((m) => {
    if (!Array.isArray(m.tool_calls)) return m;
    return {
      ...m,
      tool_calls: (m.tool_calls as Array<Record<string, unknown>>).map(({ extra_content: _descartado, ...resto }) => resto),
    };
  });
}

/**
 * Gemini 3 rechaza llamadas a herramientas del historial sin firma — pasa
 * cuando la vuelta anterior la contestó Groq. Su documentación indica esta
 * firma comodín para llamadas que no generó Gemini.
 */
export function conFirmaParaGemini(messages: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return messages.map((m) => {
    if (!Array.isArray(m.tool_calls)) return m;
    return {
      ...m,
      tool_calls: (m.tool_calls as Array<Record<string, unknown>>).map((tc) =>
        tc.extra_content ? tc : { ...tc, extra_content: { google: { thought_signature: 'skip_thought_signature_validator' } } },
      ),
    };
  });
}

export interface ChatCompletionMessage {
  role?: string;
  content?: string | null;
  tool_calls?: GroqToolCall[];
}

/** DTO normalizado — el mismo shape sin importar qué vendor respondió (OpenAI-compatible). */
export interface ChatCompletionOutput {
  message: ChatCompletionMessage;
}
