import { describe, expect, it } from 'vitest';
import { MemoryCacheStore } from '../../cache/MemoryCacheStore';
import { ProviderRateLimitedError } from './Provider';
import { ConCupoDiario } from './TopeDiario';

describe('ConCupoDiario', () => {
  it('deja pasar hasta el tope y después corta sin llamar al vendor', async () => {
    let llamadas = 0;
    const p = new ConCupoDiario({ name: 'x', tier: 1, call: async () => ++llamadas }, new MemoryCacheStore(), 2);
    await p.call(undefined);
    await p.call(undefined);
    const error = await p.call(undefined).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderRateLimitedError);
    expect((error as ProviderRateLimitedError).retryAfterMs).toBeGreaterThan(0);
    expect(llamadas).toBe(2);
  });
});
