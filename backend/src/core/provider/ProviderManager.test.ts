import { describe, expect, it } from 'vitest';
import { MemoryCacheStore } from '../../cache/MemoryCacheStore';
import { ProviderInputError, ProviderRateLimitedError, type IProvider } from './Provider';
import { ProviderManager } from './ProviderManager';

function provider(name: string, tier: number, call: () => Promise<string>): IProvider<string, string> {
  return { name, tier, call };
}

describe('ProviderManager', () => {
  it('un rate limit apaga el provider solo por el cooldown corto, no por el largo', async () => {
    let llamadas = 0;
    const limitado = provider('a', 1, async () => {
      llamadas++;
      throw new ProviderRateLimitedError('a', '429');
    });
    const respaldo = provider('b', 2, async () => 'ok-b');
    const cache = new MemoryCacheStore();
    const manager = new ProviderManager([limitado, respaldo], cache, {
      rateLimitCooldownMs: 50,
      circuitBreaker: { cooldownMs: 10 * 60 * 1000 },
    });

    expect(await manager.execute('x')).toBe('ok-b');
    // Abierto: no se vuelve a llamar a "a" enseguida.
    expect(await manager.execute('x')).toBe('ok-b');
    expect(llamadas).toBe(1);

    await new Promise((r) => setTimeout(r, 70));
    await manager.execute('x');
    expect(llamadas).toBe(2);
  });

  it('un 400 puntual pasa al siguiente sin abrir el circuito', async () => {
    let llamadas = 0;
    const mal = provider('a', 1, async () => {
      llamadas++;
      throw new ProviderInputError('a', '400 tool_use_failed');
    });
    const manager = new ProviderManager([mal, provider('b', 2, async () => 'ok')], new MemoryCacheStore());
    for (let i = 0; i < 5; i++) expect(await manager.execute('x')).toBe('ok');
    expect(llamadas).toBe(5);
  });

  it('con todos los circuitos abiertos prueba igual si tryAllWhenAllOpen', async () => {
    let falla = true;
    const p = provider('a', 1, async () => {
      if (falla) throw new Error('caído');
      return 'volvió';
    });
    const manager = new ProviderManager([p], new MemoryCacheStore(), {
      circuitBreaker: { failureThreshold: 1, cooldownMs: 60_000 },
      tryAllWhenAllOpen: true,
    });
    await expect(manager.execute('x')).rejects.toThrow('caído');
    falla = false;
    expect(await manager.execute('x')).toBe('volvió');
  });

  it('respeta el plazo total: no arranca intentos sin tiempo', async () => {
    let llamadas = 0;
    const p = provider('a', 1, async () => {
      llamadas++;
      return 'ok';
    });
    const manager = new ProviderManager([p], new MemoryCacheStore());
    await expect(manager.execute('x', { deadlineAt: Date.now() + 500 })).rejects.toThrow();
    expect(llamadas).toBe(0);
  });

  it('si todos están sin cuota, espera al primero que se libera dentro del plazo', async () => {
    let llamadas = 0;
    const p = provider('a', 1, async () => {
      llamadas++;
      if (llamadas === 1) throw new ProviderRateLimitedError('a', '429', 100);
      return 'ok';
    });
    const manager = new ProviderManager([p], new MemoryCacheStore(), { waitForCooldownWithinDeadline: true });
    expect(await manager.execute('x', { deadlineAt: Date.now() + 5000 })).toBe('ok');
    expect(llamadas).toBe(2);
  });

  it('no espera si el cooldown no entra en el plazo', async () => {
    const p = provider('a', 1, async () => {
      throw new ProviderRateLimitedError('a', '429', 60_000);
    });
    const manager = new ProviderManager([p], new MemoryCacheStore(), { waitForCooldownWithinDeadline: true });
    await expect(manager.execute('x', { deadlineAt: Date.now() + 5000 })).rejects.toThrow('429');
  });
});
