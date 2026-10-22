import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const JUEGOS = ['ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos', 'jardin', 'bloques', 'palabras'] as const;
export type Juego = (typeof JUEGOS)[number];
export type ResultadoPartida = 'ganado' | 'perdido';

export async function registrarPartida(
  residenteId: string,
  organizacionId: string,
  juego: Juego,
  resultado: ResultadoPartida | null,
  puntos: number | null = null,
): Promise<void> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'registrarPartida', residenteId, organizacionId, juego, resultado, puntos });
  try {
  const { error } = await getSupabaseAdmin().from('partidas_juegos').insert({
    residente_id: residenteId,
    organizacion_id: organizacionId,
    juego,
    resultado,
    puntos,
  });
  if (error) throw new Error(`Error al registrar la partida: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'registrarPartida', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface EstadisticasPuntaje {
  mejorPuntaje: number | null;
  ultimoPuntaje: number | null;
  partidasJugadas: number;
}

/** Mejor puntaje, último puntaje y cantidad de partidas de un residente en un juego de puntaje. */
export async function obtenerEstadisticasPuntaje(residenteId: string, juego: Juego): Promise<EstadisticasPuntaje> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'obtenerEstadisticasPuntaje', residenteId, juego });
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('partidas_juegos')
      .select('puntos, created_at')
      .eq('residente_id', residenteId)
      .eq('juego', juego)
      .not('puntos', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Error al cargar las estadísticas: ${error.message}`);

    const filas = (data ?? []) as Array<{ puntos: number; created_at: string }>;
    const primera = filas[0] as { puntos: number; created_at: string } | undefined;
    return {
      mejorPuntaje: filas.length ? Math.max(...filas.map((f) => f.puntos)) : null,
      ultimoPuntaje: primera ? primera.puntos : null,
      partidasJugadas: filas.length,
    };
  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'obtenerEstadisticasPuntaje', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface TopPuntaje {
  residenteId: string;
  nombre: string;
  puntos: number;
}

/** Top N residentes con mejor puntaje en un juego, dentro de la organización — para el ranking que ven todos los residentes. */
export async function obtenerTopPuntajes(organizacionId: string, juego: Juego, limite = 3): Promise<TopPuntaje[]> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'obtenerTopPuntajes', organizacionId, juego, limite });
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('partidas_juegos')
      .select('residente_id, puntos, residente:residentes(nombre, apellido, nombre_completo)')
      .eq('organizacion_id', organizacionId)
      .eq('juego', juego)
      .not('puntos', 'is', null)
      .order('puntos', { ascending: false });
    if (error) throw new Error(`Error al cargar el top de puntajes: ${error.message}`);

    type ResidenteNombre = { nombre: string | null; apellido: string | null; nombre_completo: string | null };
    type Fila = { residente_id: string; puntos: number; residente: unknown };

    const nombreDe = (residente: unknown): string => {
      const r = (Array.isArray(residente) ? residente[0] : residente) as ResidenteNombre | null | undefined;
      return r?.nombre_completo || [r?.nombre, r?.apellido].filter(Boolean).join(' ') || 'Residente';
    };

    // Las filas ya vienen ordenadas de mayor a menor puntaje — nos quedamos
    // con la primera aparición de cada residente (su mejor puntaje) hasta
    // completar el límite pedido.
    const top: TopPuntaje[] = [];
    const vistos = new Set<string>();
    for (const fila of (data ?? []) as unknown as Fila[]) {
      if (vistos.has(fila.residente_id)) continue;
      vistos.add(fila.residente_id);
      top.push({ residenteId: fila.residente_id, nombre: nombreDe(fila.residente), puntos: fila.puntos });
      if (top.length >= limite) break;
    }
    return top;
  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'obtenerTopPuntajes', error: err instanceof Error ? err.message : String(err) });
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

export interface ResumenJuego {
  juego: Juego;
  partidas: number;
  ganadas: number;
  perdidas: number;
  /** Mejor puntaje — solo los juegos de puntaje (Jardín, Bloques, etc.) lo tienen. */
  mejorPuntaje: number | null;
  ultimaPartida: string | null;
}

/** Resumen por juego de un residente (partidas, ganadas/perdidas, mejor puntaje, última vez) — ficha del usuario en el backoffice. */
export async function resumenPorJuego(residenteId: string): Promise<ResumenJuego[]> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'resumenPorJuego', residenteId });
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('partidas_juegos')
      .select('juego, resultado, puntos, created_at')
      .eq('residente_id', residenteId);
    if (error) throw new Error(`Error al cargar las partidas: ${error.message}`);

    const resumen = new Map<string, ResumenJuego>(
      JUEGOS.map((juego) => [juego, { juego, partidas: 0, ganadas: 0, perdidas: 0, mejorPuntaje: null, ultimaPartida: null }]),
    );
    for (const fila of (data ?? []) as Array<{ juego: string; resultado: string | null; puntos: number | null; created_at: string }>) {
      const r = resumen.get(fila.juego);
      if (!r) continue;
      r.partidas += 1;
      if (fila.resultado === 'ganado') r.ganadas += 1;
      if (fila.resultado === 'perdido') r.perdidas += 1;
      if (fila.puntos !== null && (r.mejorPuntaje === null || fila.puntos > r.mejorPuntaje)) r.mejorPuntaje = fila.puntos;
      if (!r.ultimaPartida || fila.created_at > r.ultimaPartida) r.ultimaPartida = fila.created_at;
    }
    return [...resumen.values()];
  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'resumenPorJuego', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface FilaRankingJuego {
  residenteId: string;
  nombre: string;
  partidas: number;
  ganadas: number;
  perdidas: number;
  mejorPuntaje: number | null;
  puntosTotal: number;
  ultimaPartida: string | null;
}

/** Ranking de un juego en la organización — lo agrega Postgres (función ranking_juego). */
export async function rankingJuego(organizacionId: string, juego: Juego, desde: string | null, limite: number): Promise<FilaRankingJuego[]> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'rankingJuego', organizacionId, juego, desde });
  try {
    const { data, error } = await getSupabaseAdmin().rpc('ranking_juego', { p_org: organizacionId, p_juego: juego, p_desde: desde, p_limite: limite });
    if (error) throw new Error(`Error al cargar el ranking: ${error.message}`);
    type Fila = { residente_id: string; nombre: string; partidas: number; ganadas: number; perdidas: number; mejor_puntaje: number | null; puntos_total: number; ultima_partida: string | null };
    return ((data ?? []) as Fila[]).map((f) => ({
      residenteId: f.residente_id,
      nombre: f.nombre,
      partidas: Number(f.partidas),
      ganadas: Number(f.ganadas),
      perdidas: Number(f.perdidas),
      mejorPuntaje: f.mejor_puntaje,
      puntosTotal: Number(f.puntos_total),
      ultimaPartida: f.ultima_partida,
    }));
  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'rankingJuego', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface FilaResumenJuego {
  juego: Juego;
  partidas: number;
  jugadores: number;
  ganadas: number;
  mejorPuntaje: number | null;
  ultimaPartida: string | null;
}

/** Totales por juego de toda la organización (función resumen_juegos). Incluye juegos sin partidas, en 0. */
export async function resumenJuegos(organizacionId: string, desde: string | null): Promise<FilaResumenJuego[]> {
  logger.info('repo:call', { repository: 'gamesRepository', action: 'resumenJuegos', organizacionId, desde });
  try {
    const { data, error } = await getSupabaseAdmin().rpc('resumen_juegos', { p_org: organizacionId, p_desde: desde });
    if (error) throw new Error(`Error al cargar el resumen de juegos: ${error.message}`);
    type Fila = { juego: string; partidas: number; jugadores: number; ganadas: number; mejor_puntaje: number | null; ultima_partida: string | null };
    const porJuego = new Map(((data ?? []) as Fila[]).map((f) => [f.juego, f]));
    return JUEGOS.map((juego) => {
      const f = porJuego.get(juego);
      return {
        juego,
        partidas: f ? Number(f.partidas) : 0,
        jugadores: f ? Number(f.jugadores) : 0,
        ganadas: f ? Number(f.ganadas) : 0,
        mejorPuntaje: f?.mejor_puntaje ?? null,
        ultimaPartida: f?.ultima_partida ?? null,
      };
    });
  } catch (err) {
    logger.error('repo:error', { repository: 'gamesRepository', action: 'resumenJuegos', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
