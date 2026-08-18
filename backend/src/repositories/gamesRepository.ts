import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export const JUEGOS = ['ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos', 'jardin', 'bloques'] as const;
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
