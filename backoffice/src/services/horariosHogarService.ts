// ========================================
// SERVICIO: Horarios del Hogar (feed externo)
// DESCRIPCIÓN:
// Lee, a través de nuestro backend, la grilla de actividades que publica el
// sistema del hogar. El backend la guarda en caché 5 min; "actualizar" fuerza
// una lectura nueva.
// ========================================
import { apiClient } from '@/lib/apiClient';

export interface ActividadHogar {
  id: number;
  nombre: string;
  dia: string;
  hora: string | null;
  horario: string;
  lugar: string | null;
  sectores: string[];
  tallerista: string | null;
  estado: string;
  suspendido: boolean;
}

export interface HorariosHogar {
  generadoEn: string | null;
  actualizadoEn: string;
  actividades: ActividadHogar[];
}

export const obtenerHorariosHogar = () => apiClient.get<HorariosHogar>('/api/admin/horarios-externos');
export const actualizarHorariosHogar = () => apiClient.post<HorariosHogar>('/api/admin/horarios-externos/actualizar');
