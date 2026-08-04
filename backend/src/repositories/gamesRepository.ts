import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const JUEGOS = ['ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos'] as const;
export type Juego = (typeof JUEGOS)[number];
export type ResultadoPartida = 'ganado' | 'perdido';

export async function registrarPartida(residenteId: string, organizacionId: string, juego: Juego, resultado: ResultadoPartida | null): Promise<void> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'registrarPartida', residenteId, organizacionId, juego, resultado });
  try {
  const { error } = await getSupabaseAdmin().from('partidas_juegos').insert({
    residente_id: residenteId,
    organizacion_id: organizacionId,
    juego,
    resultado,
  });
  if (error) throw new Error(`Error al registrar la partida: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'registrarPartida', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ConteoPorJuego {
  juego: Juego;
  cantidad: number;
}

/** Cantidad de partidas por juego para un residente — usado en su ficha en el backoffice. */
export async function contarPartidasPorJuego(residenteId: string): Promise<ConteoPorJuego[]> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'contarPartidasPorJuego', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin().from('partidas_juegos').select('juego').eq('residente_id', residenteId);
  if (error) throw new Error(`Error al cargar las partidas: ${error.message}`);

  const conteo = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ juego: string }>) {
    conteo.set(row.juego, (conteo.get(row.juego) ?? 0) + 1);
  }
  return JUEGOS.map((juego) => ({ juego, cantidad: conteo.get(juego) ?? 0 }));

  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'contarPartidasPorJuego', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
