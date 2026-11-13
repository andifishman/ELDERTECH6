import { logger } from '../logging/logger';
import type { CacheStore } from './CacheStore';
import { MemoryCacheStore } from './MemoryCacheStore';

/** Tras una falla del cache remoto, cuánto tiempo usar solo la memoria antes de volver a probarlo. */
const PAUSA_TRAS_FALLA_MS = 60_000;

/**
 * Cache remoto (Upstash) con respaldo en memoria. Todo el backend pasa por el
 * cache — circuit breakers, rate limit, cupos diarios —, así que si Upstash
 * se cae o se queda sin cuota (su plan gratis corta al llegar al límite
 * mensual), sin esto fallaba TODO: el asistente, el clima, la radio. Con
 * esto se sigue andando con el estado local de cada instancia hasta que
 * Upstash vuelva.
 */
export class ResilientCacheStore implements CacheStore {
  private readonly memoria = new MemoryCacheStore();
  private remotoPausadoHasta = 0;

  constructor(private readonly remoto: CacheStore) {}

  private async conRespaldo<T>(operacion: string, remota: () => Promise<T>, local: () => Promise<T>): Promise<T> {
    if (Date.now() < this.remotoPausadoHasta) return local();
    try {
      return await remota();
    } catch (error) {
      this.remotoPausadoHasta = Date.now() + PAUSA_TRAS_FALLA_MS;
      logger.warn('Cache remoto falló — se usa memoria local por un rato', {
        operacion,
        error: error instanceof Error ? error.message : String(error),
      });
      return local();
    }
  }

  get<T>(key: string): Promise<T | null> {
    return this.conRespaldo('get', () => this.remoto.get<T>(key), () => this.memoria.get<T>(key));
  }

  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.conRespaldo(
      'set',
      () => this.remoto.set(key, value, ttlSeconds),
      () => this.memoria.set(key, value, ttlSeconds),
    );
  }

  delete(key: string): Promise<void> {
    return this.conRespaldo('delete', () => this.remoto.delete(key), () => this.memoria.delete(key));
  }

  increment(key: string, ttlSeconds: number): Promise<number> {
    return this.conRespaldo(
      'increment',
      () => this.remoto.increment(key, ttlSeconds),
      () => this.memoria.increment(key, ttlSeconds),
    );
  }
}
