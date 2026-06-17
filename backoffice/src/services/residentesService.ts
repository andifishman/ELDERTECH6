// ========================================
// SERVICIO: Residentes
// DESCRIPCIÓN:
// CRUD de residentes del geriátrico. Desactivar un
// residente le quita acceso a la app.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { NivelDificultad, Residente } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

export interface ResidenteInput {
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string | null;
  habitacion?: string | null;
  piso?: string | null;
  nivel_dificultad: NivelDificultad;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  notas?: string | null;
}

export async function listarResidentes(): Promise<Residente[]> {
  const { data, error } = await supabase
    .from('residentes')
    .select('*')
    .eq('organizacion_id', ORG_ID)
    .order('apellido', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Residente[];
}

export async function crearResidente(input: ResidenteInput): Promise<string> {
  const { data, error } = await supabase
    .from('residentes')
    .insert({ ...input, organizacion_id: ORG_ID, activo: true })
    .select('id')
    .single();
  if (error) throw error;
  await registrarAuditoria({
    accion: 'crear',
    tabla: 'residentes',
    registroId: data.id,
    descripcion: `Creó al residente ${input.nombre} ${input.apellido}`,
  });
  return data.id;
}

export async function actualizarResidente(id: string, input: ResidenteInput): Promise<void> {
  const { error } = await supabase
    .from('residentes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: 'editar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `Editó al residente ${input.nombre} ${input.apellido}`,
  });
}

export async function setActivoResidente(id: string, activo: boolean, nombre?: string): Promise<void> {
  const { error } = await supabase
    .from('residentes')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `${activo ? 'Reactivó' : 'Desactivó'} a ${nombre ?? 'un residente'}`,
  });
}
