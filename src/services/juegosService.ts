// Servicio: registro de partidas jugadas (para que el backoffice pueda ver
// cuántas veces jugó cada residente a cada juego, y para mostrar el mejor
// puntaje en los juegos de puntaje). Habla con el backend propio.
import { apiClient } from './apiClient';

export type Juego = 'ahorcado' | 'memotest' | 'simon' | 'conexiones' | 'laberinto' | 'sopa' | 'puntos' | 'jardin' | 'bloques';

export interface EstadisticasPuntaje {
  mejorPuntaje: number | null;
  ultimoPuntaje: number | null;
  partidasJugadas: number;
}

/** Best-effort — si falla (sin red, etc.) no interrumpe la experiencia de juego. */
export async function registrarPartida(juego: Juego, resultado?: 'ganado' | 'perdido' | null, puntos?: number | null): Promise<void> {
  try {
    await apiClient.post<void>('/api/games/log', { juego, resultado: resultado ?? null, puntos: puntos ?? null });
  } catch (err) {
    console.warn('[juegos] no se pudo registrar la partida', err);
  }
}

export async function obtenerEstadisticasPuntaje(juego: Juego): Promise<EstadisticasPuntaje> {
  return apiClient.get<EstadisticasPuntaje>(`/api/games/${juego}/estadisticas`);
}
