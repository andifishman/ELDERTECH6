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
