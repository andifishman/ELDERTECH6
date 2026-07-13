import type { CacheStore } from '../../cache/CacheStore';

export interface ProviderMetrics {
  requests: number;
  errors: number;
  /** Media móvil exponencial de latencia (ms) — no un promedio simple, para que picks recientes pesen más. */
  avgLatencyMs: number;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
}

const EMA_ALPHA = 0.3;
const METRICS_TTL_SECONDS = 24 * 60 * 60;

/** Métricas por provider, respaldadas en el mismo CacheStore que el circuit breaker. */
export class MetricsStore {
  constructor(private readonly cache: CacheStore) {}

  async recordSuccess(providerName: string, latencyMs: number): Promise<void> {
    const current = await this.get(providerName);
    const avgLatencyMs =
      current.requests === 0 ? latencyMs : EMA_ALPHA * latencyMs + (1 - EMA_ALPHA) * current.avgLatencyMs;

    await this.save(providerName, {
      requests: current.requests + 1,
      errors: current.errors,
      avgLatencyMs,
      lastSuccessAt: Date.now(),
      lastErrorAt: current.lastErrorAt,
    });
  }

  async recordFailure(providerName: string): Promise<void> {
    const current = await this.get(providerName);
    await this.save(providerName, {
      ...current,
      requests: current.requests + 1,
      errors: current.errors + 1,
      lastErrorAt: Date.now(),
    });
  }

  async get(providerName: string): Promise<ProviderMetrics> {
    const metrics = await this.cache.get<ProviderMetrics>(this.key(providerName));
    return metrics ?? { requests: 0, errors: 0, avgLatencyMs: 0, lastSuccessAt: null, lastErrorAt: null };
  }

  private key(providerName: string): string {
    return `metrics:${providerName}`;
  }

  private async save(providerName: string, metrics: ProviderMetrics): Promise<void> {
    await this.cache.set(this.key(providerName), metrics, METRICS_TTL_SECONDS);
  }
}
