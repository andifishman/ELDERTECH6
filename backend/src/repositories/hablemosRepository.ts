import { getSupabaseAdmin } from './supabaseAdmin';
import { withRepoLogging } from '../logging/repoLogger';
import type {
  Conversacion,
  ConversacionConDetalle,
  CrearMensajeAudioInput,
  CrearMensajeTextoInput,
  ListarMensajesOpciones,
  MensajeHablemos,
  ResidenteResumenHablemos,
} from '../providers/hablemos/HablemosTypes';

const REPO = 'hablemosRepository';

export const crearConversacion = withRepoLogging(REPO, 'crearConversacion', async (
  organizacionId: string,
  creadoPor: string,
  otroResidenteId: string,
): Promise<Conversacion> => {
  const db = getSupabaseAdmin();

  const { data: conversacion, error } = await db
    .from('conversaciones')
    .insert({ organizacion_id: organizacionId, creado_por: creadoPor })
    .select('*')
    .single();
  if (error) throw new Error(`Error al crear la conversación: ${error.message}`);

  const { error: participantesError } = await db.from('conversacion_participantes').insert([
    { conversacion_id: conversacion.id, residente_id: creadoPor },
    { conversacion_id: conversacion.id, residente_id: otroResidenteId },
  ]);
  if (participantesError) throw new Error(`Error al agregar los participantes: ${participantesError.message}`);

  return conversacion as Conversacion;
});

/** Devuelve la conversación 1:1 ya existente entre dos residentes, si la hay. */
export const buscarConversacionEntreResidentes = withRepoLogging(REPO, 'buscarConversacionEntreResidentes', async (
  residenteAId: string,
  residenteBId: string,
): Promise<Conversacion | null> => {
  const db = getSupabaseAdmin();

  const { data: deA, error: errorA } = await db
    .from('conversacion_participantes')
    .select('conversacion_id')
    .eq('residente_id', residenteAId);
  if (errorA) throw new Error(`Error al buscar la conversación: ${errorA.message}`);

  const conversacionIds = (deA ?? []).map((r) => r.conversacion_id as string);
  if (conversacionIds.length === 0) return null;

  const { data: match, error: errorB } = await db
    .from('conversacion_participantes')
    .select('conversacion_id')
    .eq('residente_id', residenteBId)
    .in('conversacion_id', conversacionIds)
    .limit(1)
    .maybeSingle();
  if (errorB) throw new Error(`Error al buscar la conversación: ${errorB.message}`);
  if (!match) return null;

  const { data: conversacion, error: errorC } = await db
    .from('conversaciones')
    .select('*')
    .eq('id', match.conversacion_id)
    .maybeSingle();
  if (errorC) throw new Error(`Error al buscar la conversación: ${errorC.message}`);
  return (conversacion as Conversacion) ?? null;
});

// Nota: "foto_url" todavía no existe en la tabla `residentes` de esta base
// (pendiente de una migración previa sin aplicar, ajena a Hablemos) — no se
// selecciona en el join y se completa en null acá mientras tanto.
function mapResidente(row: unknown): ResidenteResumenHablemos | null {
  const r = row as Omit<ResidenteResumenHablemos, 'foto_url'> | Omit<ResidenteResumenHablemos, 'foto_url'>[] | null;
  if (!r) return null;
  const resumen = Array.isArray(r) ? r[0] : r;
  return resumen ? { ...resumen, foto_url: null } : null;
}

export const listarConversaciones = withRepoLogging(REPO, 'listarConversaciones', async (
  residenteId: string,
): Promise<ConversacionConDetalle[]> => {
  const db = getSupabaseAdmin();

  const { data: propias, error } = await db
    .from('conversacion_participantes')
    .select('conversacion_id, no_leidos_count, conversacion:conversaciones(*)')
    .eq('residente_id', residenteId);
  if (error) throw new Error(`Error al cargar tus conversaciones: ${error.message}`);

  const filas = (propias ?? []) as unknown as Array<{
    conversacion_id: string;
    no_leidos_count: number;
    conversacion: Conversacion | Conversacion[] | null;
  }>;
  if (filas.length === 0) return [];

  const conversacionIds = filas.map((f) => f.conversacion_id);

  const { data: otros, error: errorOtros } = await db
    .from('conversacion_participantes')
    .select('conversacion_id, residente:residentes(id, nombre, apellido)')
    .in('conversacion_id', conversacionIds)
    .neq('residente_id', residenteId);
  if (errorOtros) throw new Error(`Error al cargar los participantes: ${errorOtros.message}`);

  const otroPorConversacion = new Map<string, ResidenteResumenHablemos | null>();
  for (const fila of (otros ?? []) as unknown as Array<{ conversacion_id: string; residente: unknown }>) {
    otroPorConversacion.set(fila.conversacion_id, mapResidente(fila.residente));
  }

  const resultado: ConversacionConDetalle[] = filas.map((f) => {
    const conversacion = Array.isArray(f.conversacion) ? f.conversacion[0] : f.conversacion;
    return {
      ...(conversacion as Conversacion),
      noLeidosCount: f.no_leidos_count,
      otroParticipante: otroPorConversacion.get(f.conversacion_id) ?? null,
    };
  });

  resultado.sort((a, b) => {
    const fechaA = a.ultimo_mensaje_at ?? a.created_at;
    const fechaB = b.ultimo_mensaje_at ?? b.created_at;
    return fechaB.localeCompare(fechaA);
  });

  return resultado;
});

/** Enriquece una conversación con el otro participante y el no-leídos de `residenteId` — para devolver tras crear/buscar una conversación sin un round-trip extra del frontend. */
export const obtenerConversacionConDetalle = withRepoLogging(REPO, 'obtenerConversacionConDetalle', async (
  conversacionId: string,
  residenteId: string,
): Promise<ConversacionConDetalle | null> => {
  const db = getSupabaseAdmin();

  const [conversacionR, propiaR, otroR] = await Promise.all([
    db.from('conversaciones').select('*').eq('id', conversacionId).maybeSingle(),
    db.from('conversacion_participantes').select('no_leidos_count').eq('conversacion_id', conversacionId).eq('residente_id', residenteId).maybeSingle(),
    db
      .from('conversacion_participantes')
      .select('residente:residentes(id, nombre, apellido)')
      .eq('conversacion_id', conversacionId)
      .neq('residente_id', residenteId)
      .maybeSingle(),
  ]);

  if (conversacionR.error) throw new Error(`Error al cargar la conversación: ${conversacionR.error.message}`);
  if (!conversacionR.data) return null;

  return {
    ...(conversacionR.data as Conversacion),
    noLeidosCount: propiaR.data?.no_leidos_count ?? 0,
    otroParticipante: mapResidente((otroR.data as { residente: unknown } | null)?.residente ?? null),
  };
});

/** Devuelve la conversación solo si `residenteId` participa de ella — null en cualquier otro caso (incluida "no existe"). */
export const obtenerConversacionSiParticipa = withRepoLogging(REPO, 'obtenerConversacionSiParticipa', async (
  conversacionId: string,
  residenteId: string,
): Promise<Conversacion | null> => {
  const db = getSupabaseAdmin();

  const { data: participa, error: errorParticipa } = await db
    .from('conversacion_participantes')
    .select('conversacion_id')
    .eq('conversacion_id', conversacionId)
    .eq('residente_id', residenteId)
    .maybeSingle();
  if (errorParticipa) throw new Error(`Error al validar la conversación: ${errorParticipa.message}`);
  if (!participa) return null;

  const { data: conversacion, error } = await db.from('conversaciones').select('*').eq('id', conversacionId).maybeSingle();
  if (error) throw new Error(`Error al cargar la conversación: ${error.message}`);
  return (conversacion as Conversacion) ?? null;
});

export const listarMensajes = withRepoLogging(REPO, 'listarMensajes', async (
  conversacionId: string,
  opciones: ListarMensajesOpciones,
): Promise<MensajeHablemos[]> => {
  const db = getSupabaseAdmin();
  let query = db
    .from('mensajes_hablemos')
    .select('*')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: false })
    .limit(opciones.limit);

  if (opciones.before) query = query.lt('created_at', opciones.before);

  const { data, error } = await query;
  if (error) throw new Error(`Error al cargar los mensajes: ${error.message}`);
  return (data ?? []) as MensajeHablemos[];
});

export const crearMensajeTexto = withRepoLogging(REPO, 'crearMensajeTexto', async (
  input: CrearMensajeTextoInput,
): Promise<MensajeHablemos> => {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_hablemos')
    .insert({
      conversacion_id: input.conversacionId,
      remitente_id: input.remitenteId,
      tipo: 'texto',
      contenido: input.contenido,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Error al enviar el mensaje: ${error.message}`);
  return data as MensajeHablemos;
});

export const crearMensajeAudio = withRepoLogging(REPO, 'crearMensajeAudio', async (
  input: CrearMensajeAudioInput,
): Promise<MensajeHablemos> => {
  const { data, error } = await getSupabaseAdmin()
    .from('mensajes_hablemos')
    .insert({
      conversacion_id: input.conversacionId,
      remitente_id: input.remitenteId,
      tipo: 'audio',
      audio_url: input.audioUrl,
      audio_duracion_segundos: input.audioDuracionSegundos,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Error al enviar el mensaje de voz: ${error.message}`);
  return data as MensajeHablemos;
});

/** Marca como "recibido" los mensajes ajenos que todavía estaban en "enviado" (nunca retrocede uno ya "leído"). */
export const marcarRecibidos = withRepoLogging(REPO, 'marcarRecibidos', async (
  conversacionId: string,
  residenteId: string,
): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('mensajes_hablemos')
    .update({ estado: 'recibido', recibido_en: new Date().toISOString() })
    .eq('conversacion_id', conversacionId)
    .neq('remitente_id', residenteId)
    .eq('estado', 'enviado');
  if (error) throw new Error(`Error al marcar los mensajes como recibidos: ${error.message}`);
});

/** Marca como "leído" los mensajes ajenos pendientes y resetea el contador de no-leídos de `residenteId`. */
export const marcarLeidos = withRepoLogging(REPO, 'marcarLeidos', async (
  conversacionId: string,
  residenteId: string,
): Promise<void> => {
  const db = getSupabaseAdmin();

  const { error: errorMensajes } = await db
    .from('mensajes_hablemos')
    .update({ estado: 'leido', leido_en: new Date().toISOString() })
    .eq('conversacion_id', conversacionId)
    .neq('remitente_id', residenteId)
    .neq('estado', 'leido');
  if (errorMensajes) throw new Error(`Error al marcar los mensajes como leídos: ${errorMensajes.message}`);

  const { error: errorContador } = await db
    .from('conversacion_participantes')
    .update({ no_leidos_count: 0 })
    .eq('conversacion_id', conversacionId)
    .eq('residente_id', residenteId);
  if (errorContador) throw new Error(`Error al actualizar el contador de no leídos: ${errorContador.message}`);
});

/** Sube al bucket `hablemos-audio`. */
export const subirAudio = withRepoLogging(REPO, 'subirAudio', async (
  conversacionId: string,
  residenteId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> => {
  const ext = originalName.split('.').pop() ?? 'm4a';
  const path = `${conversacionId}/${residenteId}-${Date.now()}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('hablemos-audio').upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir el mensaje de voz: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('hablemos-audio').getPublicUrl(path);
  return data.publicUrl;
});
