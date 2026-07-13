import { getSupabaseAdmin } from './supabaseAdmin';

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
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .insert({ residente_id: residenteId })
    .select()
    .single();

  if (error) throw new Error(`Error al crear sesión: ${error.message}`);
  return data as SesionAsistente;
}

export async function getSesionesRecientes(residenteId: string, limit = 10): Promise<SesionAsistente[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error al cargar sesiones: ${error.message}`);
  return (data ?? []) as SesionAsistente[];
}

/** Verifica que la sesión pertenezca al residente antes de cualquier operación — reemplaza el rol que hacía RLS. */
export async function sesionPerteneceAResidente(sesionId: string, residenteId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('sesiones_asistente')
    .select('id')
    .eq('id', sesionId)
    .eq('residente_id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al validar la sesión: ${error.message}`);
  return data !== null;
}

export async function actualizarTituloSesion(sesionId: string, titulo: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('sesiones_asistente').update({ titulo }).eq('id', sesionId);
  if (error) throw new Error(`Error al actualizar el título: ${error.message}`);
}

export async function getMensajesDeSesion(sesionId: string): Promise<MensajeAsistente[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('*')
    .eq('sesion_id', sesionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Error al cargar mensajes: ${error.message}`);
  return (data ?? []) as MensajeAsistente[];
}

export async function guardarMensaje(
  sesionId: string,
  residenteId: string,
  rol: 'usuario' | 'asistente',
  contenido: string,
): Promise<MensajeAsistente> {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .insert({ sesion_id: sesionId, residente_id: residenteId, rol, contenido })
    .select()
    .single();

  if (error) throw new Error(`Error al guardar mensaje: ${error.message}`);
  return data as MensajeAsistente;
}

/** Valida que el mensaje sea del residente antes de tocar el favorito — reemplaza el rol que hacía RLS. */
export async function mensajePerteneceAResidente(mensajeId: string, residenteId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('id')
    .eq('id', mensajeId)
    .eq('residente_id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al validar el mensaje: ${error.message}`);
  return data !== null;
}

export async function toggleFavoritoMensaje(mensajeId: string, esFavorito: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .update({ es_favorito: esFavorito })
    .eq('id', mensajeId);

  if (error) throw new Error(`Error al actualizar favorito: ${error.message}`);
}

export async function getMensajesFavoritos(residenteId: string): Promise<MensajeAsistente[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_asistente')
    .select('*')
    .eq('residente_id', residenteId)
    .eq('es_favorito', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as MensajeAsistente[];
}

export async function getFaq(): Promise<FaqAsistente[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('faq_asistente')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error) return [];
  return (data ?? []) as FaqAsistente[];
}
