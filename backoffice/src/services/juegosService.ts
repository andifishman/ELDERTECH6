// ========================================
// SERVICIO: Juegos (ranking y estadísticas)
// DESCRIPCIÓN:
// El backend agrega en la base y cachea 10 minutos, así que abrir esta
// pantalla es barato. `fresh` saltea esa caché (botón "Actualizar").
// ========================================
import { apiClient } from '@/lib/apiClient';

export type Periodo = 'todo' | 'semana' | 'mes';

export interface ResumenJuego {
  juego: string;
  partidas: number;
  jugadores: number;
  ganadas: number;
  mejorPuntaje: number | null;
  ultimaPartida: string | null;
}

export interface FilaRanking {
  residenteId: string;
  nombre: string;
  partidas: number;
  ganadas: number;
  perdidas: number;
  mejorPuntaje: number | null;
  puntosTotal: number;
  ultimaPartida: string | null;
}

/** El backend devuelve el dato junto con el momento en que se calculó (para mostrar "actualizado hace…"). */
export interface ConFecha<T> {
  datos: T;
  generadoEn: string;
}

function query(periodo: Periodo, fresh: boolean): string {
  return `?periodo=${periodo}${fresh ? '&fresh=1' : ''}`;
}

export async function obtenerResumenJuegos(periodo: Periodo, fresh = false): Promise<ConFecha<ResumenJuego[]>> {
  return apiClient.get<ConFecha<ResumenJuego[]>>(`/api/admin/games/resumen${query(periodo, fresh)}`);
}

export async function obtenerRankingJuego(juego: string, periodo: Periodo, fresh = false): Promise<ConFecha<FilaRanking[]>> {
  return apiClient.get<ConFecha<FilaRanking[]>>(`/api/admin/games/ranking/${juego}${query(periodo, fresh)}`);
}
