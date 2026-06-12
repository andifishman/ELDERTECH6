import { NivelDificultad } from './database.types';

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
  foto_url: string | null;
  nivel_dificultad: NivelDificultad;
  email: string | null;
  piso: string | null;
  habitacion: string | null;
  activo: boolean;
}

export interface AuthProfile {
  perfil: PerfilUsuario;
  residente: ResidenteAuth | null;
  residente_interes_ids: string[];
}

/** Ciudad buscada libremente (Open-Meteo), no existe en la tabla ciudades_familiares */
export interface CiudadCustom {
  nombre: string;
  pais_codigo: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface RegisterFormData {
  // Step 1
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  foto_uri: string | null;
  // Step 2
  username: string;
  email: string;
  password: string;
  confirmar_password: string;
  // Step 3
  piso: string;
  habitacion: string;
  nivel_dificultad: NivelDificultad;
  intereses: string[];
  /** IDs de ciudades predeterminadas de la tabla ciudades_familiares */
  ciudades_familiares: string[];
  /** Ciudades buscadas libremente que no están en la tabla predeterminada */
  ciudades_familiares_custom: CiudadCustom[];
}

export type RegisterStep = 1 | 2 | 3;

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

export type ValidationErrors = Partial<Record<string, string>>;
