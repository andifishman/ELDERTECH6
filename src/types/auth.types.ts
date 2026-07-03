import { NivelDificultad, SeccionResidente } from './database.types';

export type RolUsuario = 'residente' | 'admin' | 'staff';

export interface PerfilUsuario {
  id: string;
  residente_id: string | null;
  organizacion_id: string;
  username: string;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResidenteAuth {
  id: string;
  organizacion_id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  nivel_dificultad: NivelDificultad;
  seccion: SeccionResidente | null;
  habitacion: string | null;
  activo: boolean;
}

export interface AuthProfile {
  perfil: PerfilUsuario;
  residente: ResidenteAuth | null;
  residente_interes_ids: string[];
}

export interface Interes {
  id: string;
  nombre: string;
  emoji: string | null;
}

export interface CiudadFamiliar {
  id: string;
  nombre: string;
  pais_codigo: string;
  orden: number;
}
