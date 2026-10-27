// Horarios del Hogar — los trae nuestro backend (que a su vez lee el sistema del hogar y lo guarda
// en caché 5 min). La app nunca le pega al sistema externo.
import { apiClient } from './apiClient';

export interface ActividadHogar {
  id: number;
  nombre: string;
  dia: string;
  /** "HH:MM" para ordenar/comparar; null si es "Horario a coordinar". */
  hora: string | null;
  /** Texto listo para mostrar ("09:00 hs"). */
  horario: string;
  lugar: string | null;
  sectores: string[];
  tallerista: string | null;
  suspendido: boolean;
}

export interface HorariosHogar {
  generadoEn: string | null;
  actualizadoEn: string;
  actividades: ActividadHogar[];
}

export function getHorariosHogar(): Promise<HorariosHogar> {
  return apiClient.get<HorariosHogar>('/api/horarios-externos');
}
