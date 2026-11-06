// Entrada a la app de familiares (endpoints públicos: todavía no hay sesión).
import { apiClient } from '@/lib/apiClient';

export type EstadoAcceso = 'registrado' | 'no_registrado' | 'deshabilitado';

export interface Institucion {
  id: string;
  nombre: string;
}

export interface SolicitudAcceso {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  residenteTexto: string;
  parentesco: string | null;
  organizacionId?: string;
}

/** ¿Este email está dado de alta? Si no, trae las residencias para que pueda pedir acceso. */
export const verificarEmail = (email: string) => apiClient.post<{ estado: EstadoAcceso; instituciones: Institucion[] }>('/api/acceso-familia/verificar', { email });

/** Deja el pedido en la bandeja del personal de la residencia. */
export const solicitarAcceso = (input: SolicitudAcceso) => apiClient.post<{ ok: true }>('/api/acceso-familia/solicitar', input);
