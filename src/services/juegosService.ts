// Servicio: registro de partidas jugadas (para que el backoffice pueda ver
// cuántas veces jugó cada residente a cada juego, y para mostrar el mejor
// puntaje en los juegos de puntaje). Habla con el backend propio.
import { apiClient, ApiError } from './apiClient';

export type Juego = 'ahorcado' | 'memotest' | 'simon' | 'conexiones' | 'laberinto' | 'sopa' | 'puntos' | 'jardin' | 'bloques';

export interface EstadisticasPuntaje {
  mejorPuntaje: number | null;
  ultimoPuntaje: number | null;
  partidasJugadas: number;
}

export interface TopPuntaje {
  residenteId: string;
  nombre: string;
  puntos: number;
}

/**
 * Best-effort — si falla (sin red, sesión vencida, etc.) no interrumpe la
 * experiencia de juego, así que nunca rechaza. Devuelve `true`/`false` en vez
 * de tragarse el resultado en silencio: antes esto no se sabía nunca (solo un
 * `console.warn` que nadie ve en producción), y si el guardado fallaba, el
 * puntaje simplemente no entraba al Top 3 sin ninguna pista de por qué. Los
 * llamadores que muestran un ranking (como Bloques) pueden usar el resultado
 * para avisar y ofrecer reintentar, en vez de quedar en silencio.
 */
export async function registrarPartida(juego: Juego, resultado?: 'ganado' | 'perdido' | null, puntos?: number | null): Promise<boolean> {
  try {
    await apiClient.post<void>('/api/games/log', { juego, resultado: resultado ?? null, puntos: puntos ?? null });
    return true;
  } catch (err) {
    const detalle = err instanceof ApiError ? `${err.status} ${err.message}` : err;
    console.warn(`[juegos] no se pudo registrar la partida de "${juego}"`, detalle);
    return false;
  }
}

export async function obtenerEstadisticasPuntaje(juego: Juego): Promise<EstadisticasPuntaje> {
  return apiClient.get<EstadisticasPuntaje>(`/api/games/${juego}/estadisticas`);
}

/** Top 3 residentes con mejor puntaje en un juego, dentro de la misma organización (residencia). */
export async function obtenerTopPuntajes(juego: Juego): Promise<TopPuntaje[]> {
  return apiClient.get<TopPuntaje[]>(`/api/games/${juego}/top`);
}
