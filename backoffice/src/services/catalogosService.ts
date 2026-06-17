// ========================================
// SERVICIO: Catálogos
// DESCRIPCIÓN:
// Lee las tablas de catálogo que alimentan los selects
// de los formularios: tipos de actividad, ubicaciones,
// responsables, intereses y pisos.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { TipoActividad, Ubicacion, Responsable, Interes, Piso } from '@/types/database.types';

export interface Catalogos {
  tiposActividad: TipoActividad[];
  ubicaciones: Ubicacion[];
  responsables: Responsable[];
  intereses: Interes[];
  pisos: Piso[];
}

export async function obtenerCatalogos(): Promise<Catalogos> {
  // los tipos de actividad pueden ser globales (organizacion_id NULL) o propios de la org
  const [tipos, ubic, resp, inter, pisos] = await Promise.all([
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
    supabase.from('pisos').select('*').eq('organizacion_id', ORG_ID).eq('activo', true).order('numero'),
  ]);

  return {
    tiposActividad: (tipos.data ?? []) as TipoActividad[],
    ubicaciones: (ubic.data ?? []) as Ubicacion[],
    responsables: (resp.data ?? []) as Responsable[],
    intereses: (inter.data ?? []) as Interes[],
    pisos: (pisos.data ?? []) as Piso[],
  };
}
