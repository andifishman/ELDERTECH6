import { getSupabaseAdmin } from './supabaseAdmin';
import type {
  DestinoFiltro,
  DestinoTipo,
  EstadoDestinatario,
  EstadoNotificacion,
  Notification,
  NotificationInput,
  NotificationRecipient,
  RecipientStats,
} from '../providers/notifications/NotificationTypes';

const NOTIFICATION_SELECT = '*';

// ─── Resolución de audiencia ────────────────────────────────────────────────────

interface ResidenteBasico {
  id: string;
  nombre: string;
  apellido: string;
}

/**
 * Devuelve los residentes activos que matchean el destino elegido. `especificos`
 * usa `destino_filtro.residente_ids` tal cual; el resto arma un query sobre
 * `residentes` (o `residente_intereses` para el caso de intereses). Siempre se
 * excluyen los ids de `excluirResidenteIds` al final, sin importar el destino.
 */
export async function resolverAudiencia(
  organizacionId: string,
  destinoTipo: DestinoTipo,
  destinoFiltro: DestinoFiltro | null,
  excluirResidenteIds: string[] | null,
): Promise<ResidenteBasico[]> {
  const db = getSupabaseAdmin();
  let residentes: ResidenteBasico[] = [];

  if (destinoTipo === 'especificos') {
    const ids = destinoFiltro?.residente_ids ?? [];
    if (ids.length === 0) return [];
    const { data, error } = await db.from('residentes').select('id, nombre, apellido').in('id', ids).eq('activo', true);
    if (error) throw new Error(`Error al resolver destinatarios: ${error.message}`);
    residentes = (data ?? []) as ResidenteBasico[];
  } else if (destinoTipo === 'intereses') {
    const interesIds = destinoFiltro?.interes_ids ?? [];
    if (interesIds.length === 0) return [];
    const { data, error } = await db
      .from('residente_intereses')
      .select('residente:residentes!inner(id, nombre, apellido, activo, organizacion_id)')
      .in('interes_id', interesIds);
    if (error) throw new Error(`Error al resolver destinatarios: ${error.message}`);
    const vistos = new Set<string>();
    for (const row of (data ?? []) as unknown as Array<{ residente: ResidenteBasico & { activo: boolean; organizacion_id: string } }>) {
      const r = row.residente;
      if (r && r.activo && r.organizacion_id === organizacionId && !vistos.has(r.id)) {
        vistos.add(r.id);
        residentes.push({ id: r.id, nombre: r.nombre, apellido: r.apellido });
      }
    }
  } else {
    let query = db.from('residentes').select('id, nombre, apellido').eq('organizacion_id', organizacionId).eq('activo', true);
    if (destinoTipo === 'seccion' && destinoFiltro?.seccion) query = query.eq('seccion', destinoFiltro.seccion);
    if (destinoTipo === 'habitacion' && destinoFiltro?.habitacion) query = query.eq('habitacion', destinoFiltro.habitacion);
    if (destinoTipo === 'nivel_dificultad' && destinoFiltro?.nivel_dificultad) query = query.eq('nivel_dificultad', destinoFiltro.nivel_dificultad);
    // 'todos' / 'residentes': sin filtro adicional — todos los residentes activos de la organización.
    const { data, error } = await query;
    if (error) throw new Error(`Error al resolver destinatarios: ${error.message}`);
    residentes = (data ?? []) as ResidenteBasico[];
  }

  if (excluirResidenteIds && excluirResidenteIds.length > 0) {
    const excluidos = new Set(excluirResidenteIds);
    residentes = residentes.filter((r) => !excluidos.has(r.id));
  }
  return residentes;
}

// ─── CRUD notifications ─────────────────────────────────────────────────────────

export async function crear(organizacionId: string, creadoPor: string | null, input: NotificationInput, estado: EstadoNotificacion): Promise<Notification> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .insert({
      organizacion_id: organizacionId,
      titulo: input.titulo,
      mensaje: input.mensaje,
      imagen_url: input.imagen_url ?? null,
      icono: input.icono ?? null,
      tipo: input.tipo,
      destino_tipo: input.destino_tipo,
      destino_filtro: input.destino_filtro ?? null,
      excluir_residente_ids: input.excluir_residente_ids ?? null,
      programacion_tipo: input.programacion_tipo,
      programada_para: input.programada_para ?? null,
      recurrencia: input.recurrencia ?? 'ninguna',
      estado,
      silenciosa: input.silenciosa ?? false,
      sonido: input.sonido ?? true,
      vibracion: input.vibracion ?? true,
      prioridad: input.prioridad ?? 'normal',
      pantalla_destino: input.pantalla_destino ?? null,
      creado_por: creadoPor,
    })
    .select(NOTIFICATION_SELECT)
    .single();
  if (error) throw new Error(`Error al crear la notificación: ${error.message}`);
  return data as Notification;
}

export async function actualizar(id: string, input: Partial<NotificationInput>): Promise<Notification> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(NOTIFICATION_SELECT)
    .single();
  if (error) throw new Error(`Error al actualizar la notificación: ${error.message}`);
  return data as Notification;
}

export async function actualizarEstado(id: string, campos: Partial<Notification>): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('notifications')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar la notificación: ${error.message}`);
}

export async function obtenerPorId(id: string): Promise<Notification | null> {
  const { data, error } = await getSupabaseAdmin().from('notifications').select(NOTIFICATION_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la notificación: ${error.message}`);
  return (data as Notification) ?? null;
}

export async function eliminar(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('notifications').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar la notificación: ${error.message}`);
}

export interface ListarFiltros {
  estado?: EstadoNotificacion;
  busqueda?: string;
  orden?: 'recientes' | 'antiguas';
  pagina: number;
  porPagina: number;
}

export interface ListarResultado {
  items: Array<Notification & { destinatarios_count: number }>;
  total: number;
}

export async function listar(organizacionId: string, filtros: ListarFiltros): Promise<ListarResultado> {
  const db = getSupabaseAdmin();
  let query = db.from('notifications').select('*, notification_recipients(count)', { count: 'exact' }).eq('organizacion_id', organizacionId);

  if (filtros.estado) query = query.eq('estado', filtros.estado);
  if (filtros.busqueda) query = query.or(`titulo.ilike.%${filtros.busqueda}%,mensaje.ilike.%${filtros.busqueda}%`);
  query = query.order('created_at', { ascending: filtros.orden === 'antiguas' });

  const desde = (filtros.pagina - 1) * filtros.porPagina;
  query = query.range(desde, desde + filtros.porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Error al listar notificaciones: ${error.message}`);

  const items = ((data ?? []) as unknown as Array<Notification & { notification_recipients: Array<{ count: number }> }>).map((n) => ({
    ...n,
    destinatarios_count: n.notification_recipients?.[0]?.count ?? 0,
  }));
  return { items, total: count ?? 0 };
}

/** Notificaciones programadas cuya hora ya llegó — usado por el procesador cron. */
export async function listarProgramadasVencidas(): Promise<Notification[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('estado', 'programada')
    .lte('programada_para', new Date().toISOString());
  if (error) throw new Error(`Error al buscar notificaciones programadas: ${error.message}`);
  return (data ?? []) as Notification[];
}

// ─── Destinatarios (fanout) ──────────────────────────────────────────────────────

export async function crearDestinatarios(
  notificationId: string,
  filas: Array<{ residenteId: string; deviceTokenId: string | null }>,
): Promise<NotificationRecipient[]> {
  if (filas.length === 0) return [];
  const { data, error } = await getSupabaseAdmin()
    .from('notification_recipients')
    .insert(filas.map((f) => ({ notification_id: notificationId, residente_id: f.residenteId, device_token_id: f.deviceTokenId })))
    .select('*');
  if (error) throw new Error(`Error al preparar destinatarios: ${error.message}`);
  return (data ?? []) as NotificationRecipient[];
}

export async function eliminarDestinatarios(notificationId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('notification_recipients').delete().eq('notification_id', notificationId);
  if (error) throw new Error(`Error al limpiar destinatarios: ${error.message}`);
}

export async function actualizarDestinatario(id: string, campos: Partial<NotificationRecipient>): Promise<void> {
  const { error } = await getSupabaseAdmin().from('notification_recipients').update(campos).eq('id', id);
  if (error) throw new Error(`Error al actualizar destinatario: ${error.message}`);
}

/** Destinatarios `enviado` con ticket pendiente de chequear recibo — usado por el procesador cron. */
export async function listarDestinatariosConTicketPendiente(limit = 500): Promise<NotificationRecipient[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('notification_recipients')
    .select('*')
    .eq('estado', 'enviado')
    .not('expo_ticket_id', 'is', null)
    .limit(limit);
  if (error) throw new Error(`Error al buscar destinatarios pendientes: ${error.message}`);
  return (data ?? []) as NotificationRecipient[];
}

export async function marcarAbierto(notificationId: string, residenteId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('notification_recipients')
    .update({ estado: 'abierto', abierto_en: new Date().toISOString() })
    .eq('notification_id', notificationId)
    .eq('residente_id', residenteId);
  if (error) throw new Error(`Error al registrar apertura: ${error.message}`);
}

export async function obtenerStats(notificationId: string): Promise<RecipientStats> {
  const { data, error } = await getSupabaseAdmin().from('notification_recipients').select('estado').eq('notification_id', notificationId);
  if (error) throw new Error(`Error al calcular estadísticas: ${error.message}`);

  const filas = (data ?? []) as Array<{ estado: EstadoDestinatario }>;
  const contar = (estado: EstadoDestinatario) => filas.filter((f) => f.estado === estado).length;
  return {
    alcanzados: filas.length,
    enviados: contar('enviado') + contar('entregado') + contar('abierto'),
    entregados: contar('entregado') + contar('abierto'),
    abiertos: contar('abierto'),
    fallidos: contar('fallido'),
    pendientes: contar('pendiente'),
  };
}

export interface DestinatarioDetalle extends NotificationRecipient {
  residente: ResidenteBasico | null;
}

export async function listarDestinatariosDetalle(notificationId: string): Promise<DestinatarioDetalle[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('notification_recipients')
    .select('*, residente:residentes(id, nombre, apellido)')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Error al cargar destinatarios: ${error.message}`);
  return ((data ?? []) as unknown as Array<DestinatarioDetalle & { residente: ResidenteBasico | ResidenteBasico[] | null }>).map((r) => ({
    ...r,
    residente: Array.isArray(r.residente) ? (r.residente[0] ?? null) : r.residente,
  }));
}

// ─── Logs ────────────────────────────────────────────────────────────────────────

export type AccionNotificacion = 'crear' | 'editar' | 'eliminar' | 'programar' | 'cancelar' | 'enviar' | 'reenviar' | 'duplicar' | 'error';

export async function registrarLog(params: {
  notificationId: string | null;
  usuarioId: string | null;
  accion: AccionNotificacion;
  descripcion?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from('notification_logs').insert({
    notification_id: params.notificationId,
    usuario_id: params.usuarioId,
    accion: params.accion,
    descripcion: params.descripcion ?? null,
    metadata: params.metadata ?? null,
  });
  if (error) throw new Error(`Error al registrar el log: ${error.message}`);
}

export async function listarLogs(notificationId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('notification_logs')
    .select('*')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Error al cargar los logs: ${error.message}`);
  return data ?? [];
}
