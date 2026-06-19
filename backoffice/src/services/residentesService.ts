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

export interface ResidenteDetalle {
  residente: Residente;
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { nombre: string; emoji: string | null }[];
  tutorialesCompletados: { titulo: string; thumbnail_url: string | null; completado_at: string | null }[];
  ciudadesClima: string[];
}

export async function obtenerResidenteDetalle(id: string): Promise<ResidenteDetalle> {
  const { data: residente, error } = await supabase
    .from('residentes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const [mensajesR, interesesR, tutorialesR, climaR] = await Promise.allSettled([
    supabase
      .from('mensajes_asistente')
      .select('id, contenido, created_at')
      .eq('residente_id', id)
      .eq('rol', 'usuario')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('residente_intereses')
      .select('interes:intereses(nombre, emoji)')
      .eq('residente_id', id),
    supabase
      .from('progreso_tutorial')
      .select('tutorial:tutoriales(titulo, thumbnail_url), completado, updated_at')
      .eq('residente_id', id)
      .eq('completado', true)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('residente_ciudades_familiares')
      .select('ciudad:ciudades_familiares(nombre, pais_codigo)')
      .eq('residente_id', id),
  ]);

  return {
    residente: residente as Residente,
    mensajes: mensajesR.status === 'fulfilled' ? (mensajesR.value.data ?? []) as any[] : [],
    intereses: interesesR.status === 'fulfilled'
      ? ((interesesR.value.data ?? []) as any[]).map((r) => r.interes).filter(Boolean)
      : [],
    tutorialesCompletados: tutorialesR.status === 'fulfilled'
      ? ((tutorialesR.value.data ?? []) as any[])
          .map((r) => ({ titulo: r.tutorial?.titulo ?? '', thumbnail_url: r.tutorial?.thumbnail_url ?? null, completado_at: r.updated_at }))
          .filter((r) => r.titulo)
      : [],
    ciudadesClima: climaR.status === 'fulfilled'
      ? ((climaR.value.data ?? []) as any[])
          .map((r) => {
            const ciudad = r.ciudad;
            if (!ciudad?.nombre) return null;
            return ciudad.pais_codigo ? `${ciudad.nombre} (${ciudad.pais_codigo})` : ciudad.nombre;
          })
          .filter(Boolean) as string[]
      : [],
  };
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
