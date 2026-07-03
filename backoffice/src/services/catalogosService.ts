import { supabase, ORG_ID } from '@/lib/supabase';
import { SECCIONES } from '@/types/database.types';
import type { TipoActividad, Ubicacion, Responsable, Interes, SeccionResidente } from '@/types/database.types';
import { extraerMensajeError } from './actividadesService';

export type { extraerMensajeError };

export interface Catalogos {
  tiposActividad: TipoActividad[];
  ubicaciones: Ubicacion[];
  responsables: Responsable[];
  intereses: Interes[];
  secciones: SeccionResidente[];
}

export async function obtenerCatalogos(): Promise<Catalogos> {
  const [tipos, ubic, resp, inter] = await Promise.all([
    supabase
      .from('tipos_actividad')
      .select('*')
      .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
      .eq('activo', true)
      .order('nombre'),
    supabase.from('ubicaciones').select('*').eq('organizacion_id', ORG_ID).eq('activo', true).order('nombre'),
    supabase
      .from('responsables')
      .select('*')
      .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
      .eq('activo', true)
      .order('nombre'),
    supabase.from('intereses').select('*').eq('activo', true).order('nombre'),
  ]);

  return {
    tiposActividad: (tipos.data ?? []) as TipoActividad[],
    ubicaciones: (ubic.data ?? []) as Ubicacion[],
    responsables: (resp.data ?? []) as Responsable[],
    intereses: (inter.data ?? []) as Interes[],
    secciones: SECCIONES,
  };
}

export interface CrearTipoActividadInput {
  nombre: string;
  emoji?: string;
  hora_inicio_default?: string;
  hora_fin_default?: string;
}

export async function crearTipoActividad(input: CrearTipoActividadInput): Promise<string> {
  const { data, error } = await supabase
    .from('tipos_actividad')
    .insert({
      nombre: input.nombre,
      emoji: input.emoji || null,
      hora_inicio_default: input.hora_inicio_default || null,
      hora_fin_default: input.hora_fin_default || null,
      organizacion_id: ORG_ID,
      activo: true,
    })
    .select('id')
    .single();
  if (error) {
    const msg = extraerMensajeError(error);
    throw new Error(msg ?? 'Error al crear tipo de actividad');
  }
  return data.id as string;
}

export async function crearUbicacion(nombre: string): Promise<string> {
  const { data, error } = await supabase
    .from('ubicaciones')
    .insert({ nombre, organizacion_id: ORG_ID, activo: true })
    .select('id')
    .single();
  if (error) {
    const msg = extraerMensajeError(error);
    throw new Error(msg ?? 'Error al crear ubicación');
  }
  return data.id as string;
}

export async function crearResponsable(nombreCompleto: string): Promise<string> {
  const partes = nombreCompleto.trim().split(/\s+/);
  const nombre = partes[0] ?? nombreCompleto;
  const apellido = partes.slice(1).join(' ') || '';
  const { data, error } = await supabase
    .from('responsables')
    .insert({ nombre, apellido, organizacion_id: ORG_ID, activo: true, es_externo: false })
    .select('id')
    .single();
  if (error) {
    const msg = extraerMensajeError(error);
    throw new Error(msg ?? 'Error al crear responsable');
  }
  return data.id as string;
}
