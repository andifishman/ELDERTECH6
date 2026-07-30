// Servicio: registro de partidas jugadas (para que el backoffice pueda ver
// cuántas veces jugó cada residente a cada juego). Habla con el backend propio.
import { apiClient } from './apiClient';

export type Juego = 'ahorcado' | 'memotest' | 'simon' | 'conexiones' | 'laberinto' | 'sopa';

/** Best-effort — si falla (sin red, etc.) no interrumpe la experiencia de juego. */
export async function registrarPartida(juego: Juego, resultado?: 'ganado' | 'perdido' | null): Promise<void> {
  try {
    await apiClient.post<void>('/api/games/log', { juego, resultado: resultado ?? null });
  } catch (err) {
    console.warn('[juegos] no se pudo registrar la partida', err);
  }
}
