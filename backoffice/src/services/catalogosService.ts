import { apiClient } from '@/lib/apiClient';
import type { TipoActividad, Ubicacion, Responsable, SeccionResidente, Interes } from '@/types/database.types';
import { extraerMensajeError } from './actividadesService';

export type { extraerMensajeError };

export interface Catalogos {
  tiposActividad: TipoActividad[];
  ubicaciones: Ubicacion[];
  responsables: Responsable[];
  secciones: SeccionResidente[];
  intereses: Interes[];
}

export async function obtenerCatalogos(): Promise<Catalogos> {
  return apiClient.get<Catalogos>('/api/admin/catalogs');
}

export interface CrearTipoActividadInput {
  nombre: string;
  emoji?: string;
  hora_inicio_default?: string;
  hora_fin_default?: string;
}

export async function crearTipoActividad(input: CrearTipoActividadInput): Promise<string> {
  try {
    const { id } = await apiClient.post<{ id: string }>('/api/admin/catalogs/tipos-actividad', {
      nombre: input.nombre,
      emoji: input.emoji,
      horaInicioDefault: input.hora_inicio_default,
      horaFinDefault: input.hora_fin_default,
    });
    return id;
  } catch (err) {
    throw new Error(extraerMensajeError(err) ?? 'Error al crear tipo de actividad');
  }
}

export async function crearUbicacion(nombre: string): Promise<string> {
  try {
    const { id } = await apiClient.post<{ id: string }>('/api/admin/catalogs/ubicaciones', { nombre });
    return id;
  } catch (err) {
    throw new Error(extraerMensajeError(err) ?? 'Error al crear ubicación');
  }
}

export async function crearResponsable(nombreCompleto: string): Promise<string> {
  try {
    const { id } = await apiClient.post<{ id: string }>('/api/admin/catalogs/responsables', { nombreCompleto });
    return id;
  } catch (err) {
    throw new Error(extraerMensajeError(err) ?? 'Error al crear responsable');
  }
}
