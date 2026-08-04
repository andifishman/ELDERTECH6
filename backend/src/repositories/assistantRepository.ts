import { getSupabaseAdmin } from './supabaseAdmin';
import { logger } from '../logging/logger';

export interface SesionAsistente {
  id: string;
  residente_id: string;
  titulo: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface MensajeAsistente {
  id: string;
  sesion_id: string;
  residente_id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  es_favorito: boolean;
  created_at: string;
}

export interface FaqAsistente {
  id: string;
  pregunta: string;
  categoria: string;
  emoji: string;
  orden: number;
  activo: boolean;
}

export async function crearSesion(residenteId: string): Promise<SesionAsistente> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'crearSesion', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .insert({ residente_id: residenteId })
    .select()
    .single();

  if (error) throw new Error(`Error al crear sesión: ${error.message}`);
  return data as SesionAsistente;

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'crearSesion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getSesionesRecientes(residenteId: string, limit = 10): Promise<SesionAsistente[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'getSesionesRecientes', residenteId, limit });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error al cargar sesiones: ${error.message}`);
  return (data ?? []) as SesionAsistente[];

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'getSesionesRecientes', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Verifica que la sesión pertenezca al residente antes de cualquier operación — reemplaza el rol que hacía RLS. */
export async function sesionPerteneceAResidente(sesionId: string, residenteId: string): Promise<boolean> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'sesionPerteneceAResidente', sesionId, residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .select('id')
    .eq('id', sesionId)
    .eq('residente_id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al validar la sesión: ${error.message}`);
  return data !== null;

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'sesionPerteneceAResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function actualizarTituloSesion(sesionId: string, titulo: string): Promise<void> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'actualizarTituloSesion', sesionId, titulo });
  try {
  const { error } = await getSupabaseAdmin().from('sesiones_asistente').update({ titulo }).eq('id', sesionId);
  if (error) throw new Error(`Error al actualizar el título: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'actualizarTituloSesion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getMensajesDeSesion(sesionId: string): Promise<MensajeAsistente[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'getMensajesDeSesion', sesionId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error al cargar mensajes: ${error.message}`);
  return (data ?? []) as MensajeAsistente[];

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'getMensajesDeSesion', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function guardarMensaje(
  sesionId: string,
  residenteId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<MensajeAsistente> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'guardarMensaje', sesionId, residenteId, rol, contenido });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .insert({ sesion_id: sesionId, residente_id: residenteId, rol, contenido })
    .select()
    .single();

  if (error) throw new Error(`Error al guardar mensaje: ${error.message}`);
  return data as MensajeAsistente;

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'guardarMensaje', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Valida que el mensaje sea del residente antes de tocar el favorito — reemplaza el rol que hacía RLS. */
export async function mensajePerteneceAResidente(mensajeId: string, residenteId: string): Promise<boolean> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'mensajePerteneceAResidente', mensajeId, residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('id')
    .eq('id', mensajeId)
    .eq('residente_id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al validar el mensaje: ${error.message}`);
  return data !== null;

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'mensajePerteneceAResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function toggleFavoritoMensaje(mensajeId: string, esFavorito: boolean): Promise<void> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'toggleFavoritoMensaje', mensajeId, esFavorito });
  try {
  const { error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .update({ es_favorito: esFavorito })
    .eq('id', mensajeId);

  if (error) throw new Error(`Error al actualizar favorito: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'toggleFavoritoMensaje', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getMensajesFavoritos(residenteId: string): Promise<MensajeAsistente[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'getMensajesFavoritos', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .eq('es_favorito', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as MensajeAsistente[];

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'getMensajesFavoritos', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function getFaq(): Promise<FaqAsistente[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'getFaq' });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('faq_asistente')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) return [];
  return (data ?? []) as FaqAsistente[];

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'getFaq', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/faqService.ts`.

export interface FaqAdmin {
  id: string;
  pregunta: string;
  categoria: string | null;
  emoji: string | null;
  orden: number;
  activo: boolean;
}

export interface FaqAdminInput {
  pregunta: string;
  categoria?: string | null;
  emoji?: string | null;
  activo: boolean;
}

export async function listarFaqsAdmin(): Promise<FaqAdmin[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'listarFaqsAdmin' });
  try {
  const { data, error } = await getSupabaseAdmin().from('faq_asistente').select('*').order('orden', { ascending: true });
  if (error) throw new Error(`Error al cargar FAQs: ${error.message}`);
  return (data ?? []) as FaqAdmin[];

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'listarFaqsAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function crearFaqAdmin(input: FaqAdminInput): Promise<string> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'crearFaqAdmin', input });
  try {
  const { data: last } = await getSupabaseAdmin().from('faq_asistente').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle();
  const orden = ((last as { orden?: number } | null)?.orden ?? 0) + 1;

  const { data, error } = await getSupabaseAdmin().from('faq_asistente').insert({ ...input, orden }).select('id').single();
  if (error) throw new Error(`Error al crear la FAQ: ${error.message}`);
  return data.id as string;

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'crearFaqAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function actualizarFaqAdmin(id: string, input: FaqAdminInput): Promise<void> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'actualizarFaqAdmin', id, input });
  try {
  const { error } = await getSupabaseAdmin().from('faq_asistente').update({ ...input }).eq('id', id);
  if (error) throw new Error(`Error al actualizar la FAQ: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'actualizarFaqAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function eliminarFaqAdmin(id: string): Promise<void> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'eliminarFaqAdmin', id });
  try {
  const { error } = await getSupabaseAdmin().from('faq_asistente').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la FAQ: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'eliminarFaqAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function reordenarFaqAdmin(faqs: { id: string; orden: number }[]): Promise<void> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'reordenarFaqAdmin', faqs });
  try {
  await Promise.all(faqs.map(({ id, orden }) => getSupabaseAdmin().from('faq_asistente').update({ orden }).eq('id', id)));

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'reordenarFaqAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface MensajeHistorial {
  id: string;
  contenido: string;
  created_at: string;
  residente_nombre: string | null;
  residente_apellido: string | null;
}

interface HistorialRow {
  id: string;
  contenido: string;
  created_at: string;
  residente: { nombre?: string; apellido?: string } | { nombre?: string; apellido?: string }[] | null;
}

export async function obtenerHistorialMensajesAdmin(limite = 50): Promise<MensajeHistorial[]> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'obtenerHistorialMensajesAdmin', limite });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('id, contenido, created_at, residente:residentes(nombre, apellido)')
    .eq('rol', 'usuario')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Error al cargar el historial: ${error.message}`);

  return ((data ?? []) as unknown as HistorialRow[]).map((m) => {
    const residente = Array.isArray(m.residente) ? m.residente[0] : m.residente;
    return {
      id: m.id,
      contenido: m.contenido,
      created_at: m.created_at,
      residente_nombre: residente?.nombre ?? null,
      residente_apellido: residente?.apellido ?? null,
    };
  });

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'obtenerHistorialMensajesAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerStatsRaw(): Promise<{ totalConsultas: number; sesionesHoy: number; contenidos: string[] }> {
  logger.info('repo:call', { repository: 'assistantRepository', action: 'obtenerStatsRaw' });
  try {
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ count: totalConsultas }, { count: sesionesHoy }, { data: topData }] = await Promise.all([
    getSupabaseAdmin().from('mensajes_asistente').select('*', { count: 'exact', head: true }).eq('rol', 'usuario'),
    getSupabaseAdmin()
      .from('mensajes_asistente')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'usuario')
      .gte('created_at', `${hoy}T00:00:00.000Z`)
      .lte('created_at', `${hoy}T23:59:59.999Z`),
    getSupabaseAdmin().from('mensajes_asistente').select('contenido').eq('rol', 'usuario').limit(500),
  ]);

  return {
    totalConsultas: totalConsultas ?? 0,
    sesionesHoy: sesionesHoy ?? 0,
    contenidos: ((topData ?? []) as Array<{ contenido: string }>).map((m) => m.contenido).filter(Boolean),
  };

  } catch (err) {
    logger.error('repo:error', { repository: 'assistantRepository', action: 'obtenerStatsRaw', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
