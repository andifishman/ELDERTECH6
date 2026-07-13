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
  constructor(public readonly providerName: string, message = 'Rate limited') {
    super(message);
    this.name = 'ProviderRateLimitedError';
  }
}

/** Error no recuperable — NO debe reintentarse ni hacer fallback (ej. 401 de key inválida). */
export class ProviderFatalError extends Error {
  constructor(public readonly providerName: string, message: string) {
    super(message);
    this.name = 'ProviderFatalError';
  }
}
