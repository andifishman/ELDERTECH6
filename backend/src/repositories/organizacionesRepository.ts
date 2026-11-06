import { withRepoLogging } from '../logging/repoLogger';
import { getSupabaseAdmin } from './supabaseAdmin';

const REPO = 'organizacionesRepository';

export interface OrganizacionResumen {
  id: string;
  nombre: string;
  ciudad: string | null;
  /** "#RRGGBB" o null (= el violeta ElderTech por defecto) */
  colorPrincipal: string | null;
}

export interface OrganizacionDetalle extends OrganizacionResumen {
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  provincia: string | null;
  activo: boolean;
}

interface Fila {
  id: string;
  nombre: string;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  provincia: string | null;
  activo: boolean;
  color_principal?: string | null;
}

/** `select('*')` a propósito: así funciona aunque la columna `color_principal` todavía no exista (migración sin aplicar). */
function aDetalle(f: Fila): OrganizacionDetalle {
  return {
    id: f.id,
    nombre: f.nombre,
    ciudad: f.ciudad,
    direccion: f.direccion,
    telefono: f.telefono,
    email: f.email,
    provincia: f.provincia,
    activo: f.activo,
    colorPrincipal: f.color_principal ?? null,
  };
}

export const listarActivas = withRepoLogging(REPO, 'listarActivas', async (): Promise<OrganizacionResumen[]> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').eq('activo', true).order('nombre', { ascending: true });
  if (error) throw new Error(`Error al cargar las instituciones: ${error.message}`);
  return ((data ?? []) as Fila[]).map((f) => ({ id: f.id, nombre: f.nombre, ciudad: f.ciudad, colorPrincipal: f.color_principal ?? null }));
});

export const listarTodasConDetalle = withRepoLogging(REPO, 'listarTodasConDetalle', async (): Promise<OrganizacionDetalle[]> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').order('nombre', { ascending: true });
  if (error) throw new Error(`Error al cargar las instituciones: ${error.message}`);
  return ((data ?? []) as Fila[]).map(aDetalle);
});

export const obtenerActiva = withRepoLogging(REPO, 'obtenerActiva', async (id: string): Promise<OrganizacionResumen | null> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').eq('id', id).eq('activo', true).maybeSingle();
  if (error) throw new Error(`Error al cargar la institución: ${error.message}`);
  const f = data as Fila | null;
  return f ? { id: f.id, nombre: f.nombre, ciudad: f.ciudad, colorPrincipal: f.color_principal ?? null } : null;
});

export const obtenerDetalle = withRepoLogging(REPO, 'obtenerDetalle', async (id: string): Promise<OrganizacionDetalle | null> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la institución: ${error.message}`);
  return data ? aDetalle(data as Fila) : null;
});

export interface CambiosOrganizacion {
  nombre?: string;
  ciudad?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  provincia?: string | null;
  colorPrincipal?: string | null;
}

/** Devuelve 'sin_columna' si la migración del color todavía no se aplicó. */
export const actualizar = withRepoLogging(REPO, 'actualizar', async (id: string, cambios: CambiosOrganizacion): Promise<OrganizacionDetalle | null | 'sin_columna'> => {
  const fila: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) fila.nombre = cambios.nombre;
  if (cambios.ciudad !== undefined) fila.ciudad = cambios.ciudad;
  if (cambios.direccion !== undefined) fila.direccion = cambios.direccion;
  if (cambios.telefono !== undefined) fila.telefono = cambios.telefono;
  if (cambios.email !== undefined) fila.email = cambios.email;
  if (cambios.provincia !== undefined) fila.provincia = cambios.provincia;
  if (cambios.colorPrincipal !== undefined) fila.color_principal = cambios.colorPrincipal;
  const { data, error } = await getSupabaseAdmin().from('organizaciones').update(fila).eq('id', id).select('*').maybeSingle();
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204' || /color_principal/.test(error.message)) return 'sin_columna';
    throw new Error(`Error al actualizar la institución: ${error.message}`);
  }
  return data ? aDetalle(data as Fila) : null;
});
