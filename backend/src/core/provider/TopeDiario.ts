import type { CacheStore } from '../../cache/CacheStore';
import { ProviderRateLimitedError, type IProvider } from './Provider';

/** Fecha (YYYY-MM-DD) y ms hasta la medianoche, en hora de Argentina — los cupos gratis se renuevan por día. */
function diaArgentina(ahora = Date.now()): { dia: string; msHastaMedianoche: number } {
  const OFFSET_AR_MS = -3 * 60 * 60 * 1000; // Argentina no tiene horario de verano
  const local = new Date(ahora + OFFSET_AR_MS);
  const dia = local.toISOString().slice(0, 10);
  const medianocheLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return { dia, msHastaMedianoche: medianocheLocal - (ahora + OFFSET_AR_MS) };
}

/**
 * Cupo diario PROPIO para un servicio externo con plan gratis: cuenta cada
 * pedido del día (en el cache compartido, así suman todas las instancias
 * serverless) y, pasado el tope, no deja salir ni uno más hasta la
 * medianoche. Existe para garantizar costo cero: aunque alguien active la
 * facturación en la cuenta del vendor, nunca se le pide más de lo que entra
 * en el cupo gratuito.
 *
 * Cuenta intentos, no éxitos (un pedido fallido también puede contar para el
 * vendor), así que se queda del lado seguro.
 */
export async function consumirCupoDiario(
  cache: CacheStore,
  nombre: string,
  limitePorDia: number,
): Promise<{ permitido: boolean; msHastaMedianoche: number }> {
  const { dia, msHastaMedianoche } = diaArgentina();
  const usados = await cache.increment(`cupo-diario:${nombre}:${dia}`, 36 * 60 * 60);
  return { permitido: usados <= limitePorDia, msHastaMedianoche };
}

/** Envuelve un provider con `consumirCupoDiario`: sin cupo se comporta como "sin cuota" hasta la medianoche. */
export class ConCupoDiario<TInput, TOutput> implements IProvider<TInput, TOutput> {
  readonly name: string;
  readonly tier: number;

  constructor(
    private readonly inner: IProvider<TInput, TOutput>,
    private readonly cache: CacheStore,
    private readonly limitePorDia: number,
  ) {
    this.name = inner.name;
    this.tier = inner.tier;
  }

  async call(input: TInput): Promise<TOutput> {
    const { permitido, msHastaMedianoche } = await consumirCupoDiario(this.cache, this.name, this.limitePorDia);
    if (!permitido) {
      throw new ProviderRateLimitedError(
        this.name,
        `Cupo diario propio agotado (${this.limitePorDia}/día) — se corta para no generar costos`,
        msHastaMedianoche,
      );
    }
    return this.inner.call(input);
  }
}
