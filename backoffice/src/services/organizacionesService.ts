import { apiClient } from '@/lib/apiClient';

export interface Institucion {
  id: string;
  nombre: string;
  ciudad: string | null;
  /** "#RRGGBB" o null (violeta ElderTech) */
  colorPrincipal: string | null;
}

export interface InstitucionDetalle extends Institucion {
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  provincia: string | null;
  activo: boolean;
}

export interface CambiosInstitucion {
  nombre?: string;
  ciudad?: string | null;
  provincia?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  colorPrincipal?: string | null;
}

export interface Instituciones {
  /** La institución sobre la que se está trabajando ahora */
  actualId: string | null;
  /** Solo un super admin con más de una institución disponible puede cambiar */
  puedeCambiar: boolean;
  /** La institución usa la grilla externa del Hogar (solo una); el resto gestiona sus propias actividades */
  usaFeedHogar: boolean;
  /** Color principal de la institución actual */
  colorPrincipal: string | null;
  instituciones: Institucion[];
}

export const listarInstituciones = () => apiClient.get<Instituciones>('/api/admin/organizaciones');

/** Solo super admin: todas las instituciones con sus datos y su color. */
export const listarInstitucionesGestion = () => apiClient.get<InstitucionDetalle[]>('/api/admin/organizaciones/gestion');
export const actualizarInstitucion = (id: string, cambios: CambiosInstitucion) => apiClient.patch<InstitucionDetalle>(`/api/admin/organizaciones/${id}`, cambios);
