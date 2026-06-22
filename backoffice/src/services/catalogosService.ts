import { supabase, ORG_ID } from '@/lib/supabase';
import type { TipoActividad, Ubicacion, Responsable, Interes, Piso } from '@/types/database.types';

export interface Catalogos {
  tiposActividad: TipoActividad[];
  ubicaciones: Ubicacion[];
  responsables: Responsable[];
  intereses: Interes[];
  pisos: Piso[];
}

const PISOS_HARDCODED: Piso[] = [
  { id: '1', organizacion_id: ORG_ID, numero: 1, nombre: 'Piso 1', descripcion: null, activo: true },
  { id: '2', organizacion_id: ORG_ID, numero: 2, nombre: 'Piso 2', descripcion: null, activo: true },
  { id: '3', organizacion_id: ORG_ID, numero: 3, nombre: 'Piso 3', descripcion: null, activo: true },
];

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
    pisos: PISOS_HARDCODED,
  };
}

export async function crearTipoActividad(nombre: string, emoji: string): Promise<string> {
  const { data, error } = await supabase
    .from('tipos_actividad')
    .insert({ nombre, emoji: emoji || null, organizacion_id: ORG_ID, activo: true })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function crearUbicacion(nombre: string): Promise<string> {
  const { data, error } = await supabase
    .from('ubicaciones')
    .insert({ nombre, organizacion_id: ORG_ID, activo: true })
    .select('id')
    .single();
  if (error) throw error;
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
  if (error) throw error;
  return data.id as string;
}
