// ========================================
// SERVICIO: Actividades (Horarios)
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { ActividadCompleta, PatronRecurrencia } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

const SELECT_COMPLETO =
  '*, tipo_actividad:tipos_actividad(*), ubicacion:ubicaciones(*), responsable:responsables(*), actividad_intereses(interes_id)';

export interface ActividadInput {
  nombre: string;
  descripcion?: string | null;
  tipo_actividad_id?: string | null;
  ubicacion_id?: string | null;
  responsable_id?: string | null;
  emoji_icono?: string | null;
  fecha: string; // 'YYYY-MM-DD' — fecha de inicio (o fecha de la ocurrencia en edición)
  hora_inicio: string; // 'HH:MM'
  hora_fin?: string | null;
  es_recurrente: boolean;
  patron_recurrencia?: PatronRecurrencia | null;
  pisos_objetivo?: string[] | null;
  intereses?: string[];
}

// Extrae el mensaje de un error de Supabase (PostgrestError no extiende Error)
export function extraerMensajeError(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return undefined;
}

function normalizarHora(h?: string | null): string | null {
  if (!h) return null;
  return h.length === 5 ? `${h}:00` : h;
}

async function sincronizarIntereses(actividadId: string, intereses?: string[]) {
  await supabase.from('actividad_intereses').delete().eq('actividad_id', actividadId);
  if (intereses && intereses.length > 0) {
    await supabase
      .from('actividad_intereses')
      .insert(intereses.map((interes_id) => ({ actividad_id: actividadId, interes_id })));
  }
}

// Genera una fila por ocurrencia futura para una actividad recurrente.
// La plantilla (primer row) ya existe; esta función crea todas las demás.
async function generarOcurrencias(plantillaId: string, input: ActividadInput): Promise<void> {
  const { patron_recurrencia } = input;
  if (!patron_recurrencia?.dias_semana?.length) return;

  const diasSemana = patron_recurrencia.dias_semana;
  const fechaInicio = new Date(input.fecha + 'T00:00:00');

  let fechaFin: Date;
  if (patron_recurrencia.hasta) {
    fechaFin = new Date(patron_recurrencia.hasta + 'T00:00:00');
  } else {
    fechaFin = new Date(fechaInicio);
    fechaFin.setFullYear(fechaFin.getFullYear() + 1);
  }

  const rows: Record<string, unknown>[] = [];
  const cursor = new Date(fechaInicio);
  cursor.setDate(cursor.getDate() + 1); // empezar el día siguiente a la plantilla

  while (cursor <= fechaFin && rows.length < 365) {
    if (diasSemana.includes(cursor.getDay())) {
      rows.push({
        organizacion_id: ORG_ID,
        tipo_actividad_id: input.tipo_actividad_id || null,
        ubicacion_id: input.ubicacion_id || null,
        responsable_id: input.responsable_id || null,
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        emoji_icono: input.emoji_icono ?? null,
        fecha: cursor.toISOString().slice(0, 10),
        hora_inicio: normalizarHora(input.hora_inicio)!,
        hora_fin: normalizarHora(input.hora_fin),
        es_recurrente: true,
        patron_recurrencia: input.patron_recurrencia,
        pisos_objetivo: input.pisos_objetivo?.length ? input.pisos_objetivo : null,
        activo: true,
        plantilla_id: plantillaId,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Insertar en lotes de 100 para no exceder límites de payload
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('actividades').insert(rows.slice(i, i + 100));
    if (error) console.warn('Error al generar ocurrencias:', error.message);
  }
}

// Lista actividades de una fecha. Con el enfoque multi-row, cada ocurrencia
// tiene su propia fila en la DB → basta un query simple por fecha exacta.
export async function listarActividades(fecha?: string): Promise<ActividadCompleta[]> {
  if (!fecha) {
    const { data, error } = await supabase
      .from('actividades')
      .select(SELECT_COMPLETO)
      .eq('organizacion_id', ORG_ID)
      .order('hora_inicio', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ActividadCompleta[];
  }

  const { data, error } = await supabase
    .from('actividades')
    .select(SELECT_COMPLETO)
    .eq('organizacion_id', ORG_ID)
    .eq('fecha', fecha)
    .order('hora_inicio', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ActividadCompleta[];
}

export async function crearActividad(input: ActividadInput): Promise<string> {
  const { intereses, ...resto } = input;
  const { data, error } = await supabase
    .from('actividades')
    .insert({
      ...resto,
      tipo_actividad_id: resto.tipo_actividad_id || null,
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

  if (input.es_recurrente && input.patron_recurrencia?.dias_semana?.length) {
    // Marcar la plantilla con plantilla_id = su propio id (self-reference)
    await supabase.from('actividades').update({ plantilla_id: data.id }).eq('id', data.id);
    // Generar todas las ocurrencias futuras
    await generarOcurrencias(data.id, input);
  }

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

  // Obtener el plantilla_id del row que se está editando
  const { data: atual } = await supabase
    .from('actividades')
    .select('plantilla_id, fecha')
    .eq('id', id)
    .single();

  const plantillaId = atual?.plantilla_id ?? null;

  const camposComunes = {
    nombre: resto.nombre,
    descripcion: resto.descripcion ?? null,
    tipo_actividad_id: resto.tipo_actividad_id || null,
    ubicacion_id: resto.ubicacion_id || null,
    responsable_id: resto.responsable_id || null,
    emoji_icono: resto.emoji_icono ?? null,
    hora_inicio: normalizarHora(resto.hora_inicio)!,
    hora_fin: normalizarHora(resto.hora_fin),
    es_recurrente: resto.es_recurrente,
    patron_recurrencia: resto.patron_recurrencia ?? null,
    pisos_objetivo: resto.pisos_objetivo?.length ? resto.pisos_objetivo : null,
    updated_at: new Date().toISOString(),
  };

  if (plantillaId) {
    // ── Caso: actividad pertenece a un grupo recurrente ──────────────────────
    if (!input.es_recurrente) {
      // Convirtiendo a única vez: borrar ocurrencias y limpiar plantilla_id
      await supabase.from('actividades').delete()
        .eq('plantilla_id', plantillaId).neq('id', plantillaId);
      await supabase.from('actividades')
        .update({ ...camposComunes, fecha: resto.fecha, plantilla_id: null })
        .eq('id', plantillaId);
    } else {
      // Actualizar la plantilla con los nuevos campos
      const { error: eUpdate } = await supabase
        .from('actividades').update(camposComunes).eq('id', plantillaId);
      if (eUpdate) throw eUpdate;

      // Borrar todas las ocurrencias (NO la plantilla en sí)
      await supabase.from('actividades').delete()
        .eq('plantilla_id', plantillaId).neq('id', plantillaId);

      // Regenerar ocurrencias con el nuevo patrón, usando la fecha original de la plantilla
      const fechaInicio = atual?.fecha ?? resto.fecha;
      await generarOcurrencias(plantillaId, { ...input, fecha: fechaInicio });
    }
    await sincronizarIntereses(plantillaId, intereses);

    await registrarAuditoria({
      accion: 'editar',
      tabla: 'actividades',
      registroId: plantillaId,
      descripcion: `Editó la actividad "${input.nombre}" (todas las repeticiones)`,
      datosNuevos: { ...resto },
    });
  } else {
    // ── Caso: actividad única (sin grupo) ────────────────────────────────────
    if (input.es_recurrente && input.patron_recurrencia?.dias_semana?.length) {
      // Convirtiendo de única a recurrente: marcar como plantilla y generar ocurrencias
      await supabase.from('actividades')
        .update({ ...camposComunes, fecha: resto.fecha, plantilla_id: id })
        .eq('id', id);
      await generarOcurrencias(id, input);
    } else {
      const { error } = await supabase.from('actividades')
        .update({ ...camposComunes, fecha: resto.fecha }).eq('id', id);
      if (error) throw error;
    }
    await sincronizarIntereses(id, intereses);

    await registrarAuditoria({
      accion: 'editar',
      tabla: 'actividades',
      registroId: id,
      descripcion: `Editó la actividad "${input.nombre}"`,
      datosNuevos: { ...resto },
    });
  }
}

export async function setActivoActividad(id: string, activo: boolean, nombre?: string): Promise<void> {
  // Obtener plantilla_id para poder afectar a todo el grupo
  const { data: atual } = await supabase
    .from('actividades').select('plantilla_id').eq('id', id).single();
  const plantillaId = atual?.plantilla_id ?? null;

  const campos = { activo, updated_at: new Date().toISOString() };

  if (plantillaId) {
    // Pausar/reactivar toda la serie (plantilla + ocurrencias)
    await supabase.from('actividades').update(campos)
      .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  } else {
    const { error } = await supabase.from('actividades').update(campos).eq('id', id);
    if (error) throw error;
  }

  await registrarAuditoria({
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'actividades',
    registroId: plantillaId ?? id,
    descripcion: `${activo ? 'Reactivó' : 'Pausó'} la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

export async function eliminarActividad(id: string, nombre?: string): Promise<void> {
  // Obtener plantilla_id para poder borrar todo el grupo
  const { data: atual } = await supabase
    .from('actividades').select('plantilla_id').eq('id', id).single();
  const plantillaId = atual?.plantilla_id ?? null;

  if (plantillaId) {
    // Borrar intereses de la plantilla
    await supabase.from('actividad_intereses').delete().eq('actividad_id', plantillaId);
    // Borrar plantilla + todas las ocurrencias en un solo query
    await supabase.from('actividades').delete()
      .or(`id.eq.${plantillaId},plantilla_id.eq.${plantillaId}`);
  } else {
    await supabase.from('actividad_intereses').delete().eq('actividad_id', id);
    const { error } = await supabase.from('actividades').delete().eq('id', id);
    if (error) throw error;
  }

  await registrarAuditoria({
    accion: 'eliminar',
    tabla: 'actividades',
    registroId: plantillaId ?? id,
    descripcion: `Eliminó la actividad${nombre ? ` "${nombre}"` : ''}`,
  });
}

export async function obtenerActividad(id: string): Promise<ActividadCompleta | null> {
  const { data, error } = await supabase
    .from('actividades')
    .select(SELECT_COMPLETO)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ActividadCompleta) ?? null;
}
