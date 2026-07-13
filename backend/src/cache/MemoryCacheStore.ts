import type { CacheStore } from './CacheStore';

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

/**
 * Fallback para desarrollo local sin Upstash. NO comparte estado entre
 * instancias serverless — en producción (Vercel) esto significa que cada
 * instancia fría tendría su propio circuit breaker, lo cual rompe la premisa
 * de "todas las instancias coinciden en qué provider está DOWN". Por eso
 * `createCacheStore()` solo elige este fallback si faltan las credenciales
 * de Upstash, y se loguea una advertencia al arrancar.
 */
export class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const existing = this.store.get(key);
    const isExpired = existing?.expiresAt !== null && existing?.expiresAt !== undefined && existing.expiresAt < Date.now();
    if (!existing || isExpired) {
      // Primer incremento de la ventana: arranca el contador y el TTL.
      this.store.set(key, { value: 1, expiresAt: Date.now() + ttlSeconds * 1000 });
      return 1;
    }
    // Incrementos siguientes: NO se toca expiresAt, la ventana sigue corriendo.
    const next = (existing.value as number) + 1;
    this.store.set(key, { value: next, expiresAt: existing.expiresAt });
    return next;
  }
}
