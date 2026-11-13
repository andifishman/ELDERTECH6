import { describe, expect, it } from 'vitest';
import type { CacheStore } from './CacheStore';
import { ResilientCacheStore } from './ResilientCacheStore';

const caido: CacheStore = {
  get: async () => { throw new Error('upstash caído'); },
  set: async () => { throw new Error('upstash caído'); },
  delete: async () => { throw new Error('upstash caído'); },
  increment: async () => { throw new Error('upstash caído'); },
};

describe('ResilientCacheStore', () => {
  it('si el remoto falla, sigue andando con memoria local', async () => {
    const cache = new ResilientCacheStore(caido);
    await cache.set('k', 1);
    expect(await cache.get('k')).toBe(1);
    expect(await cache.increment('c', 60)).toBe(1);
    expect(await cache.increment('c', 60)).toBe(2);
  });
});
