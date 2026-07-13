import { Redis } from '@upstash/redis';
import type { CacheStore } from './CacheStore';

/** Cache/estado compartido real entre instancias serverless — vía Upstash REST. */
export class UpstashCacheStore implements CacheStore {
  private readonly redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } else {
      await this.redis.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const next = await this.redis.incr(key);
    if (next === 1) {
      // Recién creada por este INCR — le pone TTL. Si dos requests concurrentes
      // llegan a next===1 (no debería pasar con INCR atómico, pero por las dudas
      // usamos NX) no pisa un TTL ya seteado por otra instancia.
      await this.redis.expire(key, ttlSeconds, 'NX');
    }
    return next;
  }
}
