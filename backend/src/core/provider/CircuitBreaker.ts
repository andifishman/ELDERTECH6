import type { CacheStore } from '../../cache/CacheStore';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitRecord {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
}

export interface CircuitBreakerOptions {
  /** Fallas seguidas antes de abrir el circuito. Default 3. */
  failureThreshold?: number;
  /** Tiempo que el circuito queda abierto antes de permitir un intento de prueba. Default 10 min. */
  cooldownMs?: number;
}

const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000;
/** TTL del registro en cache — generoso para no perder estado entre invocaciones. */
const RECORD_TTL_SECONDS = 60 * 60;

/**
 * Circuit breaker CLOSED → OPEN → HALF_OPEN → CLOSED, con estado persistido en
 * un CacheStore compartido (Redis en prod) para que todas las instancias
 * serverless coincidan en qué provider está caído.
 *
 * Simplificación aceptada para esta escala de app: en HALF_OPEN puede haber
 * más de una invocación concurrente probando el provider a la vez (no hay
 * lock distribuido) — el peor caso es un par de intentos de más contra un
 * provider que se está recuperando, no un problema real acá.
 */
export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(
    private readonly cache: CacheStore,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  async isAvailable(providerName: string): Promise<boolean> {
    const record = await this.getRecord(providerName);
    if (record.state !== 'open') return true;

    const cooldownElapsed = record.openedAt !== null && Date.now() - record.openedAt >= this.cooldownMs;
    if (!cooldownElapsed) return false;

    await this.setRecord(providerName, { ...record, state: 'half_open' });
    return true;
  }

  async recordSuccess(providerName: string): Promise<void> {
    await this.setRecord(providerName, { state: 'closed', consecutiveFailures: 0, openedAt: null });
  }

  async recordFailure(providerName: string): Promise<void> {
    const record = await this.getRecord(providerName);
    const consecutiveFailures = record.consecutiveFailures + 1;

    // Si el intento de prueba en HALF_OPEN falla, se reabre directo sin
    // esperar a llegar de nuevo al umbral.
    if (record.state === 'half_open' || consecutiveFailures >= this.failureThreshold) {
      await this.setRecord(providerName, { state: 'open', consecutiveFailures, openedAt: Date.now() });
      return;
    }
    await this.setRecord(providerName, { state: 'closed', consecutiveFailures, openedAt: null });
  }

  async getStateSnapshot(providerName: string): Promise<CircuitRecord> {
    return this.getRecord(providerName);
  }

  private key(providerName: string): string {
    return `circuit:${providerName}`;
  }

  private async getRecord(providerName: string): Promise<CircuitRecord> {
    const record = await this.cache.get<CircuitRecord>(this.key(providerName));
    return record ?? { state: 'closed', consecutiveFailures: 0, openedAt: null };
  }

  private async setRecord(providerName: string, record: CircuitRecord): Promise<void> {
    await this.cache.set(this.key(providerName), record, RECORD_TTL_SECONDS);
  }
}
