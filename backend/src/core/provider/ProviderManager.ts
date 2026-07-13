import type { CacheStore } from '../../cache/CacheStore';
import { logger } from '../../logging/logger';
import { CircuitBreaker, type CircuitBreakerOptions, type CircuitRecord } from './CircuitBreaker';
import { MetricsStore, type ProviderMetrics } from './MetricsStore';
import { ProviderFatalError, type IProvider } from './Provider';
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
}

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

  async execute(input: TInput): Promise<TOutput> {
    const candidates = await this.rankAvailableCandidates();
    if (candidates.length === 0) {
      throw new Error('Todos los providers están fuera de servicio (circuit breaker abierto).');
    }

    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await this.callProviderWithRetries(provider, input);
      } catch (error) {
        lastError = error;
        logger.warn('Provider falló, probando el siguiente candidato', {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Todos los providers fallaron.');
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

  private async callProviderWithRetries(provider: IProvider<TInput, TOutput>, input: TInput): Promise<TOutput> {
    const retries = this.options.retriesPerProvider ?? 1;
    const timeoutMs = this.options.timeoutMs ?? 8000;
    const backoffBaseMs = this.options.backoffBaseMs ?? 300;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const startedAt = Date.now();
      try {
        const result = await this.withTimeout(provider.call(input), timeoutMs, provider.name);
        await this.metrics.recordSuccess(provider.name, Date.now() - startedAt);
        await this.circuitBreaker.recordSuccess(provider.name);
        return result;
      } catch (error) {
        await this.metrics.recordFailure(provider.name);

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
