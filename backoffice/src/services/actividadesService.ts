// ========================================
// SERVICIO: Actividades (Horarios)
// DESCRIPCIÓN:
// CRUD completo de actividades del geriátrico. Incluye
// recurrencia, pisos objetivo e intereses asociados.
// Cada mutación registra auditoría. Todo lo que cambia
// acá impacta en la pantalla Horarios de la app móvil.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { ActividadCompleta, PatronRecurrencia } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

const SELECT_COMPLETO =
  '*, tipo_actividad:tipos_actividad(*), ubicacion:ubicaciones(*), responsable:responsables(*), actividad_intereses(interes_id)';

// payload del formulario de actividad
export interface ActividadInput {
  nombre: string;
  descripcion?: string | null;
  tipo_actividad_id: string;
  ubicacion_id?: string | null;
  responsable_id?: string | null;
  emoji_icono?: string | null;
  fecha: string; // 'YYYY-MM-DD'
  hora_inicio: string; // 'HH:MM'
  hora_fin?: string | null;
  es_recurrente: boolean;
  patron_recurrencia?: PatronRecurrencia | null;
  pisos_objetivo?: string[] | null; // null/[] = todos
  intereses?: string[]; // ids de intereses (vacío = todos)
}

// lista las actividades de una fecha con todos sus joins
export async function listarActividades(fecha?: string): Promise<ActividadCompleta[]> {
  let q = supabase
    .from('actividades')
    .select(SELECT_COMPLETO)
    .eq('organizacion_id', ORG_ID)
    .order('hora_inicio', { ascending: true });

  if (fecha) q = q.eq('fecha', fecha);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ActividadCompleta[];
}

// normaliza la hora 'HH:MM' → 'HH:MM:SS'
function normalizarHora(h?: string | null): string | null {
  if (!h) return null;
  return h.length === 5 ? `${h}:00` : h;
}

// sincroniza los intereses asociados a una actividad
async function sincronizarIntereses(actividadId: string, intereses?: string[]) {
  await supabase.from('actividad_intereses').delete().eq('actividad_id', actividadId);
  if (intereses && intereses.length > 0) {
    await supabase
      .from('actividad_intereses')
      .insert(intereses.map((interes_id) => ({ actividad_id: actividadId, interes_id })));
  }
}

export async function crearActividad(input: ActividadInput): Promise<string> {
  const { intereses, ...resto } = input;
  const { data, error } = await supabase
    .from('actividades')
    .insert({
      ...resto,
      organizacion_id: ORG_ID,
      hora_inicio: normalizarHora(resto.hora_inicio)!,
      hora_fin: normalizarHora(resto.hora_fin),
      pisos_objetivo: resto.pisos_objetivo?.length ? resto.pisos_objetivo : null,
      activo: true,
    })
    .select('id')
    .single();
  if (error) throw error;

  await sincronizarIntereses(data.id, intereses);
  await registrarAuditoria({
    accion: 'crear',
    tabla: 'actividades',
    registroId: data.id,
    descripcion: `Creó la actividad "${input.nombre}"`,
    datosNuevos: { ...resto },
  });
  return data.id;
}

export async function actualizarActividad(id: string, input: ActividadInput): Promise<void> {
  const { intereses, ...resto } = input;
  const { error } = await supabase
    .from('actividades')
    .update({
      ...resto,
      hora_inicio: normalizarHora(resto.hora_inicio)!,
      hora_fin: normalizarHora(resto.hora_fin),
      pisos_objetivo: resto.pisos_objetivo?.length ? resto.pisos_objetivo : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;

  await sincronizarIntereses(id, intereses);
  await registrarAuditoria({
    accion: 'editar',
    tabla: 'actividades',
    registroId: id,
    descripcion: `Editó la actividad "${input.nombre}"`,
    datosNuevos: { ...resto },
  });
}

// pausar/reactivar = cambiar el flag activo (impacta en la app al instante)
export async function setActivoActividad(id: string, activo: boolean, nombre?: string): Promise<void> {
  const { error } = await supabase
    .from('actividades')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  await registrarAuditoria({
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'actividades',
    registroId: id,
    descripcion: `${activo ? 'Reactivó' : 'Pausó'} la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

// eliminación definitiva (solo super_admin/admin desde la UI)
export async function eliminarActividad(id: string, nombre?: string): Promise<void> {
  await supabase.from('actividad_intereses').delete().eq('actividad_id', id);
  const { error } = await supabase.from('actividades').delete().eq('id', id);
  if (error) throw error;

  await registrarAuditoria({
    accion: 'eliminar',
    tabla: 'actividades',
    registroId: id,
    descripcion: `Eliminó la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

// obtiene una actividad puntual para editar
export async function obtenerActividad(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await supabase.from('actividades').select(SELECT_COMPLETO).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as ActividadCompleta) ?? null;
}
