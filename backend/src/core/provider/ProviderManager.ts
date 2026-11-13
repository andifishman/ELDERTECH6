import type { CacheStore } from '../../cache/CacheStore';
import { logger } from '../../logging/logger';
import { CircuitBreaker, type CircuitBreakerOptions, type CircuitRecord } from './CircuitBreaker';
import { MetricsStore, type ProviderMetrics } from './MetricsStore';
import { ProviderFatalError, ProviderInputError, ProviderRateLimitedError, type IProvider } from './Provider';
import { defaultRateLimitPredicate, type RateLimitPredicate } from './RateLimitDetector';

export interface ProviderManagerOptions {
  /** Timeout por intento contra un provider. Default 8000ms. */
  timeoutMs?: number;
  /** Reintentos DENTRO del mismo provider antes de pasar al siguiente. Default 1 (sin reintento). */
  retriesPerProvider?: number;
  /** Base del backoff exponencial entre reintentos del mismo provider. Default 300ms. */
  backoffBaseMs?: number;
  circuitBreaker?: CircuitBreakerOptions;
  isRateLimitError?: RateLimitPredicate;
  /**
   * Cuánto apagar un provider sin cuota cuando el vendor no mandó `retry-after`.
   * Si no se configura, un rate limit cuenta como una falla más (comportamiento original).
   */
  rateLimitCooldownMs?: number;
  /**
   * Si TODOS los circuitos están abiertos, probar igual los providers en orden
   * de tier en vez de fallar sin intentar. Para servicios donde fallar es peor
   * que un intento de más (el chat del residente). Default false.
   */
  tryAllWhenAllOpen?: boolean;
  /**
   * Con `deadlineAt`: si todos están apagados (p. ej. sin cuota por minuto) y
   * alguno vuelve antes del plazo, esperar y reintentar en vez de fallar. Default false.
   */
  waitForCooldownWithinDeadline?: boolean;
}

export interface ExecuteOptions {
  /** Instante (epoch ms) a partir del cual no se empieza ni se espera ningún intento más. */
  deadlineAt?: number;
}

/** No vale la pena arrancar un intento con menos tiempo que esto. */
const MIN_ATTEMPT_MS = 2000;

export interface ProviderHealthSnapshot {
  name: string;
  tier: number;
  circuit: CircuitRecord;
  metrics: ProviderMetrics;
}

/**
 * Orquestador genérico: Service → ProviderManager → Provider.
 * Selecciona el provider disponible de mayor prioridad (tier), ejecuta con
 * timeout + backoff exponencial, detecta rate-limit, actualiza circuit
 * breaker y métricas, y si falla pasa al siguiente candidato.
 */
export class ProviderManager<TInput, TOutput> {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly metrics: MetricsStore;
  private readonly isRateLimitError: RateLimitPredicate;

  constructor(
    private readonly providers: ReadonlyArray<IProvider<TInput, TOutput>>,
    cache: CacheStore,
    private readonly options: ProviderManagerOptions = {},
  ) {
    if (providers.length === 0) throw new Error('ProviderManager necesita al menos un provider registrado.');
    this.circuitBreaker = new CircuitBreaker(cache, options.circuitBreaker);
    this.metrics = new MetricsStore(cache);
    this.isRateLimitError = options.isRateLimitError ?? defaultRateLimitPredicate;
  }

  async execute(input: TInput, executeOptions: ExecuteOptions = {}): Promise<TOutput> {
    const { deadlineAt } = executeOptions;
    for (;;) {
      let candidates = await this.rankAvailableCandidates();
      if (candidates.length === 0) {
        // Todos apagados, pero si alguno vuelve dentro del plazo (típico de una
        // cuota por minuto), conviene esperarlo en vez de fallar o de volver a
        // pegarles a todos y comerse otros 429.
        const espera = await this.esperaHastaElPrimeroDisponible(deadlineAt);
        if (espera !== null) {
          logger.warn('Todos los providers sin cuota — esperando al primero que se libere', { esperaMs: espera });
          await this.sleep(espera);
          continue;
        }
        if (!this.options.tryAllWhenAllOpen) {
          throw new Error('Todos los providers están fuera de servicio (circuit breaker abierto).');
        }
        logger.warn('Todos los circuitos abiertos — se prueban igual como último recurso');
        candidates = [...this.providers].sort((a, b) => a.tier - b.tier);
      }

      let lastError: unknown;
      for (const provider of candidates) {
        if (deadlineAt !== undefined && deadlineAt - Date.now() < MIN_ATTEMPT_MS) {
          lastError ??= new Error('Se agotó el tiempo disponible para responder.');
          break;
        }
        try {
          return await this.callProviderWithRetries(provider, input, deadlineAt);
        } catch (error) {
          lastError = error;
          logger.warn('Provider falló, probando el siguiente candidato', {
            provider: provider.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (this.isRateLimitError(lastError)) {
        const espera = await this.esperaHastaElPrimeroDisponible(deadlineAt);
        if (espera !== null) {
          logger.warn('Todos los providers sin cuota — esperando al primero que se libere', { esperaMs: espera });
          await this.sleep(espera);
          continue;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Todos los providers fallaron.');
    }
  }

  /**
   * Cuánto falta para que vuelva el primer provider apagado, si eso entra en
   * el plazo con tiempo para un intento. `null` = no esperar (no hay plazo,
   * la opción está apagada, o no llega).
   */
  private async esperaHastaElPrimeroDisponible(deadlineAt: number | undefined): Promise<number | null> {
    if (deadlineAt === undefined || !this.options.waitForCooldownWithinDeadline) return null;
    const esperas = await Promise.all(this.providers.map((p) => this.circuitBreaker.msUntilAvailable(p.name)));
    const minima = Math.max(Math.min(...esperas), 0) + 250;
    return Date.now() + minima + MIN_ATTEMPT_MS <= deadlineAt ? minima : null;
  }

  /** Estado + métricas de cada provider registrado — alimenta /api/admin/providers/health. */
  async getHealthSnapshot(): Promise<ProviderHealthSnapshot[]> {
    return Promise.all(
      this.providers.map(async (provider) => ({
        name: provider.name,
        tier: provider.tier,
        circuit: await this.circuitBreaker.getStateSnapshot(provider.name),
        metrics: await this.metrics.get(provider.name),
      })),
    );
  }

  private async callProviderWithRetries(
    provider: IProvider<TInput, TOutput>,
    input: TInput,
    deadlineAt?: number,
  ): Promise<TOutput> {
    const retries = this.options.retriesPerProvider ?? 1;
    const timeoutMs = this.options.timeoutMs ?? 8000;
    const backoffBaseMs = this.options.backoffBaseMs ?? 300;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const startedAt = Date.now();
      // Recortado al plazo total: así el peor caso nunca pasa el límite de la
      // función serverless (que corta con un 504 sin respuesta útil).
      const attemptTimeoutMs = deadlineAt !== undefined ? Math.min(timeoutMs, deadlineAt - startedAt) : timeoutMs;
      try {
        const result = await this.withTimeout(provider.call(input), attemptTimeoutMs, provider.name);
        await this.metrics.recordSuccess(provider.name, Date.now() - startedAt);
        await this.circuitBreaker.recordSuccess(provider.name);
        return result;
      } catch (error) {
        await this.metrics.recordFailure(provider.name);

        // Pedido puntual rechazado (400) o timeout por el recorte del plazo
        // total: el provider no está caído, no se lo castiga en el breaker.
        const fueRecorteDePlazo = attemptTimeoutMs < timeoutMs && Date.now() - startedAt >= attemptTimeoutMs;
        if (error instanceof ProviderInputError || fueRecorteDePlazo) throw error;

        if (this.isRateLimitError(error)) {
          const cooldownMs =
            (error instanceof ProviderRateLimitedError ? error.retryAfterMs : undefined) ?? this.options.rateLimitCooldownMs;
          if (cooldownMs !== undefined) {
            await this.circuitBreaker.recordRateLimited(provider.name, cooldownMs);
            throw error;
          }
        }

        // Fatal (ej. key inválida) o sin cuota: no tiene sentido reintentar
        // contra el MISMO provider — se cuenta como falla y se corta acá.
        const isUnrecoverableForThisProvider = error instanceof ProviderFatalError || this.isRateLimitError(error);
        const isLastAttempt = attempt === retries;

        if (isUnrecoverableForThisProvider || isLastAttempt) {
          await this.circuitBreaker.recordFailure(provider.name);
          throw error;
        }
        await this.sleep(backoffBaseMs * 2 ** (attempt - 1));
      }
    }
    // Inalcanzable: el loop siempre retorna o lanza en el último intento.
    throw new Error(`No se pudo ejecutar el provider ${provider.name}.`);
  }

  private async rankAvailableCandidates(): Promise<IProvider<TInput, TOutput>[]> {
    const withAvailability = await Promise.all(
      this.providers.map(async (provider) => ({
        provider,
        available: await this.circuitBreaker.isAvailable(provider.name),
      })),
    );
    const available = withAvailability.filter((entry) => entry.available).map((entry) => entry.provider);

    const withMetrics = await Promise.all(
      available.map(async (provider) => ({ provider, metrics: await this.metrics.get(provider.name) })),
    );

    return withMetrics
      .sort((a, b) => {
        if (a.provider.tier !== b.provider.tier) return a.provider.tier - b.provider.tier;
        // Desempate por latencia solo si ambos ya tienen historial — si no, se
        // respeta el orden declarado en vez de asumir datos que no existen.
        if (a.metrics.requests === 0 || b.metrics.requests === 0) return 0;
        return a.metrics.avgLatencyMs - b.metrics.avgLatencyMs;
      })
      .map((entry) => entry.provider);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout de ${timeoutMs}ms esperando al provider ${providerName}`)),
        timeoutMs,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
