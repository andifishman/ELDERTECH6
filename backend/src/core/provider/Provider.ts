/**
 * Contrato que implementa cada adapter concreto de un vendor externo
 * (OpenMeteoProvider, GroqModelProvider, StreamSourceProvider, etc).
 *
 * `call` debe devolver siempre el DTO normalizado del módulo — la traducción
 * del formato específico del vendor pasa DENTRO del provider, nunca en el
 * Service ni en el Controller. Así el frontend nunca sabe qué vendor respondió.
 */
export interface IProvider<TInput, TOutput> {
  /** Nombre único y estable — se usa como key de circuit breaker/métricas. */
  readonly name: string;
  /**
   * Prioridad declarada (menor = se intenta primero). Providers del mismo
   * tier se desempatan por latencia promedio reciente. La prioridad entre
   * tiers es una decisión de costo/negocio explícita, no algo que el sistema
   * reordene solo — evita que un provider pago desplace a uno gratis por
   * ser unos ms más rápido.
   */
  readonly tier: number;
  call(input: TInput): Promise<TOutput>;
}

/** Señal que un provider puede lanzar para indicar "estoy sin cuota ahora". */
export class ProviderRateLimitedError extends Error {
  /**
   * @param retryAfterMs Cuánto pidió esperar el vendor (header `retry-after`),
   * si lo dijo. Los límites "por minuto" se liberan en segundos: con este dato
   * el circuit breaker apaga el provider solo ese rato y no su cooldown largo.
   */
  constructor(
    public readonly providerName: string,
    message = 'Rate limited',
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ProviderRateLimitedError';
  }
}

/**
 * El vendor rechazó ESTE pedido puntual (400: p. ej. el modelo generó una
 * llamada a herramienta mal formada). El provider no está caído — otro modelo
 * o el mismo con otro pedido pueden andar —, así que se pasa al siguiente
 * candidato pero NO cuenta como falla para el circuit breaker.
 */
export class ProviderInputError extends Error {
  constructor(public readonly providerName: string, message: string) {
    super(message);
    this.name = 'ProviderInputError';
  }
}

/** Lee el header `retry-after` (segundos o fecha HTTP) y lo devuelve en ms, acotado a [1s, 5min]. */
export function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const segundos = Number(headerValue);
  const ms = Number.isFinite(segundos) ? segundos * 1000 : Date.parse(headerValue) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return Math.min(Math.max(ms, 1000), 5 * 60 * 1000);
}

/** Error no recuperable — NO debe reintentarse ni hacer fallback (ej. 401 de key inválida). */
export class ProviderFatalError extends Error {
  constructor(public readonly providerName: string, message: string) {
    super(message);
    this.name = 'ProviderFatalError';
  }
}
