import { env } from '../config/env';
import { logger } from '../logging/logger';
import type { CacheStore } from './CacheStore';
import { MemoryCacheStore } from './MemoryCacheStore';
import { UpstashCacheStore } from './UpstashCacheStore';

let instance: CacheStore | null = null;

export function getCacheStore(): CacheStore {
  if (instance) return instance;

  if (env.upstashRedisUrl && env.upstashRedisToken) {
    instance = new UpstashCacheStore(env.upstashRedisUrl, env.upstashRedisToken);
  } else {
    logger.warn(
      'UPSTASH_REDIS_REST_URL/TOKEN no configurados — usando cache en memoria. ' +
        'Los circuit breakers NO comparten estado entre instancias serverless en este modo. ' +
        'Solo apto para desarrollo local.',
    );
    instance = new MemoryCacheStore();
  }
  return instance;
}

export type { CacheStore };
