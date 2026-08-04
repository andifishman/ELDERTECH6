import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface ConfiguracionClima {
  id: string;
  organizacion_id: string;
  ciudad: string;
  latitud: number | null;
  longitud: number | null;
}

export interface CiudadFamiliar {
  id: string;
  nombre: string;
  pais_codigo: string;
  lat: number;
  lon: number;
  timezone: string;
}

export async function getConfiguracionClima(organizacionId: string): Promise<ConfiguracionClima | null> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'getConfiguracionClima', organizacionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('configuracion_clima')
    .select('id, organizacion_id, ciudad, latitud, longitud')
    .eq('organizacion_id', organizacionId)
    .eq('activo', true)
    .maybeSingle();

  if (error) return null;
  return data as ConfiguracionClima | null;

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'getConfiguracionClima', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Ciudades "familiares" ya vinculadas al residente — porteo de la carga inicial de clima.tsx. */
export async function getCiudadesFamiliaresDeResidente(residenteId: string): Promise<CiudadFamiliar[]> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'getCiudadesFamiliaresDeResidente', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('residente_ciudades_familiares')
    .select('ciudad_familiar:ciudades_familiares(id, nombre, pais_codigo, lat, lon, timezone)')
    .eq('residente_id', residenteId);

  if (error) return [];

  return ((data ?? []) as unknown as Array<{ ciudad_familiar: CiudadFamiliar | null }>)
    .map((row) => row.ciudad_familiar)
    .filter((c): c is CiudadFamiliar => !!c?.lat && !!c?.lon && !!c?.timezone);

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'getCiudadesFamiliaresDeResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/**
 * Busca una ciudad familiar por nombre+país; si no existe la crea (activo=false,
 * orden=999 — igual que hacía `resolverCiudadId` en clima.tsx). Devuelve su id.
 */
export async function resolverOCrearCiudadFamiliar(ciudad: {
  nombre: string;
  pais: string;
  lat: number;
  lon: number;
  timezone: string;
}): Promise<string | null> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'resolverOCrearCiudadFamiliar', ciudad });
  try {
  const supabase = getSupabaseAdmin();

  const { data: existente } = await supabase
    .from('ciudades_familiares')
    .select('id')
    .eq('nombre', ciudad.nombre)
    .eq('pais_codigo', ciudad.pais)
    .maybeSingle();
  if (existente?.id) return existente.id;

  const { data: nueva } = await supabase
    .from('ciudades_familiares')
    .insert({
      nombre: ciudad.nombre,
      pais_codigo: ciudad.pais,
      lat: ciudad.lat,
      lon: ciudad.lon,
      timezone: ciudad.timezone,
      activo: false,
      orden: 999,
    })
    .select('id')
    .single();
  return nueva?.id ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'resolverOCrearCiudadFamiliar', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function buscarCiudadFamiliarPorNombreYPais(nombre: string, pais: string): Promise<string | null> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'buscarCiudadFamiliarPorNombreYPais', nombre, pais });
  try {
  const { data } = await getSupabaseAdmin()
    .from('ciudades_familiares')
    .select('id')
    .eq('nombre', nombre)
    .eq('pais_codigo', pais)
    .maybeSingle();
  return data?.id ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'buscarCiudadFamiliarPorNombreYPais', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function vincularCiudadAResidente(residenteId: string, ciudadId: string): Promise<void> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'vincularCiudadAResidente', residenteId, ciudadId });
  try {
  await getSupabaseAdmin()
    .from('residente_ciudades_familiares')
    .upsert({ residente_id: residenteId, ciudad_id: ciudadId }, { onConflict: 'residente_id,ciudad_id', ignoreDuplicates: true });

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'vincularCiudadAResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function desvincularCiudadDeResidente(residenteId: string, ciudadId: string): Promise<void> {
  logger.info('repo:call', { repository: 'weatherRepository', action: 'desvincularCiudadDeResidente', residenteId, ciudadId });
  try {
  await getSupabaseAdmin()
    .from('residente_ciudades_familiares')
    .delete()
    .eq('residente_id', residenteId)
    .eq('ciudad_id', ciudadId);

  } catch (err) {
    logger.error('repo:error', { repository: 'weatherRepository', action: 'desvincularCiudadDeResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
