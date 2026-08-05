import { getSupabaseAdmin } from './supabaseAdmin';
import { env } from '../config/env';
import { logger } from '../logging/logger';

/** Resuelve la organización de un residente — la necesitan Actividades y Clima para filtrar por org. */
export async function getOrganizacionIdDeResidente(residenteId: string): Promise<string | null> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'getOrganizacionIdDeResidente', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver la organización del residente: ${error.message}`);
  return data?.organizacion_id ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'getOrganizacionIdDeResidente', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ResidenteContext {
  organizacionId: string | null;
  seccion: string | null;
}

/** Organización + sección del residente — la necesita Actividades para el algoritmo de visibilidad. */
export async function getResidenteContext(residenteId: string): Promise<ResidenteContext> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'getResidenteContext', residenteId });
  try {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id, seccion')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver el residente: ${error.message}`);
  return { organizacionId: data?.organizacion_id ?? null, seccion: data?.seccion ?? null };

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'getResidenteContext', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/residentesService.ts`.

export interface Residente {
  id: string;
  organizacion_id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  nivel_dificultad: string;
  seccion: string | null;
  habitacion: string | null;
  dni: string | null;
  telefono: string | null;
  notas: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  ultima_conexion: string | null;
  created_at: string;
  updated_at: string;
}

export type ResidenteConCuenta = Residente & { tiene_cuenta: boolean };

export interface ResidenteBusquedaResumen {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
}

/**
 * Busca residentes activos de la organización por nombre/apellido — solo devuelve
 * los que tienen cuenta (`perfiles_usuario`), porque un residente sin cuenta nunca
 * va a poder loguearse a leer un mensaje. Usado por Hablemos para "buscar usuarios".
 */
export async function buscarPorNombreConCuenta(
  organizacionId: string,
  query: string,
  excluirResidenteId: string,
): Promise<ResidenteBusquedaResumen[]> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'buscarPorNombreConCuenta', organizacionId, query, excluirResidenteId });
  try {
  // Nota: "foto_url" todavía no existe en la tabla `residentes` de esta base
  // (pendiente de una migración previa sin aplicar, ajena a Hablemos) — se
  // completa en null acá para no romper la búsqueda mientras tanto.
  const [residentesR, perfilesR] = await Promise.allSettled([
    getSupabaseAdmin()
      .from('residentes')
      .select('id, nombre, apellido')
      .eq('organizacion_id', organizacionId)
      .eq('activo', true)
      .neq('id', excluirResidenteId)
      .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
      .order('apellido', { ascending: true })
      .limit(20),
    getSupabaseAdmin().from('perfiles_usuario').select('residente_id').eq('organizacion_id', organizacionId).not('residente_id', 'is', null),
  ]);

  if (residentesR.status === 'rejected') throw new Error(`Error al buscar residentes: ${String(residentesR.reason)}`);
  if (residentesR.value.error) throw new Error(`Error al buscar residentes: ${residentesR.value.error.message}`);

  const conCuentaIds = new Set(
    perfilesR.status === 'fulfilled' ? ((perfilesR.value.data ?? []) as { residente_id: string }[]).map((p) => p.residente_id) : [],
  );

  return ((residentesR.value.data ?? []) as Array<Omit<ResidenteBusquedaResumen, 'foto_url'>>)
    .filter((r) => conCuentaIds.has(r.id))
    .map((r) => ({ ...r, foto_url: null }));

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'buscarPorNombreConCuenta', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** Nombre completo de un residente — usado por Hablemos para el título de las notificaciones push. */
export async function obtenerNombreCompleto(id: string): Promise<{ nombre: string; apellido: string } | null> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'obtenerNombreCompleto', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('residentes').select('nombre, apellido').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar el residente: ${error.message}`);
  return data ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'obtenerNombreCompleto', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function listarResidentesAdmin(organizacionId: string): Promise<ResidenteConCuenta[]> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'listarResidentesAdmin', organizacionId });
  try {
  const [residentesR, perfilesR] = await Promise.allSettled([
    getSupabaseAdmin().from('residentes').select('*').eq('organizacion_id', organizacionId).order('apellido', { ascending: true }),
    getSupabaseAdmin().from('perfiles_usuario').select('residente_id').eq('organizacion_id', organizacionId).not('residente_id', 'is', null),
  ]);

  if (residentesR.status === 'rejected') throw new Error(`Error al cargar residentes: ${String(residentesR.reason)}`);
  if (residentesR.value.error) throw new Error(`Error al cargar residentes: ${residentesR.value.error.message}`);

  const verificadosIds = new Set(
    perfilesR.status === 'fulfilled' ? ((perfilesR.value.data ?? []) as { residente_id: string }[]).map((p) => p.residente_id) : [],
  );

  return ((residentesR.value.data ?? []) as Residente[]).map((r) => ({ ...r, tiene_cuenta: verificadosIds.has(r.id) }));

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'listarResidentesAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ResidenteAdminInput {
  nombre: string;
  apellido: string;
  seccion?: string | null;
  notas?: string | null;
}

export async function actualizarResidenteAdmin(id: string, input: ResidenteAdminInput): Promise<void> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'actualizarResidenteAdmin', id, input });
  try {
  const { error } = await getSupabaseAdmin()
    .from('residentes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar residente: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'actualizarResidenteAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function setActivoResidenteAdmin(id: string, activo: boolean): Promise<void> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'setActivoResidenteAdmin', id, activo });
  try {
  const { error } = await getSupabaseAdmin()
    .from('residentes')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar residente: ${error.message}`);

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'setActivoResidenteAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export async function obtenerResidenteAdmin(id: string): Promise<Residente | null> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'obtenerResidenteAdmin', id });
  try {
  const { data, error } = await getSupabaseAdmin().from('residentes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar residente: ${error.message}`);
  return (data as Residente) ?? null;

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'obtenerResidenteAdmin', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export interface ResidenteDetalleRaw {
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { nombre: string; emoji: string | null }[];
  tutorialesCompletados: { titulo: string; thumbnail_url: string | null; completado_at: string | null }[];
  ciudadesClima: string[];
  contactos: Array<Record<string, unknown>>;
}

export async function obtenerResidenteDetalleRaw(id: string): Promise<ResidenteDetalleRaw> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'obtenerResidenteDetalleRaw', id });
  try {
  const [mensajesR, interesesR, tutorialesR, climaR, contactosR] = await Promise.allSettled([
    getSupabaseAdmin()
      .from('mensajes_asistente')
      .select('id, contenido, created_at')
      .eq('residente_id', id)
      .eq('rol', 'usuario')
      .order('created_at', { ascending: false })
      .limit(20),
    getSupabaseAdmin().from('residente_intereses').select('interes:intereses(nombre, emoji)').eq('residente_id', id),
    getSupabaseAdmin()
      .from('progreso_tutorial')
      .select('tutorial:tutoriales(titulo, thumbnail_url), completado, updated_at')
      .eq('residente_id', id)
      .eq('completado', true)
      .order('updated_at', { ascending: false })
      .limit(10),
    getSupabaseAdmin().from('residente_ciudades_familiares').select('ciudad:ciudades_familiares(nombre, pais_codigo)').eq('residente_id', id),
    getSupabaseAdmin()
      .from('contactos')
      .select('id, nombre, apellido, telefono, whatsapp_disponible, foto_url, favorito, orden, tipo_contacto:tipos_contacto(id, nombre, emoji)')
      .eq('residente_id', id)
      .eq('activo', true)
      .order('favorito', { ascending: false })
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
  ]);

  return {
    mensajes: mensajesR.status === 'fulfilled' ? ((mensajesR.value.data ?? []) as ResidenteDetalleRaw['mensajes']) : [],
    intereses:
      interesesR.status === 'fulfilled'
        ? (((interesesR.value.data ?? []) as unknown as Array<{ interes?: { nombre: string; emoji: string | null } | null }>)
            .map((r) => r.interes)
            .filter(Boolean) as ResidenteDetalleRaw['intereses'])
        : [],
    tutorialesCompletados:
      tutorialesR.status === 'fulfilled'
        ? ((tutorialesR.value.data ?? []) as unknown as Array<{ tutorial?: { titulo?: string; thumbnail_url?: string | null }; updated_at: string }>)
            .map((r) => ({ titulo: r.tutorial?.titulo ?? '', thumbnail_url: r.tutorial?.thumbnail_url ?? null, completado_at: r.updated_at }))
            .filter((r) => r.titulo)
        : [],
    ciudadesClima:
      climaR.status === 'fulfilled'
        ? (((climaR.value.data ?? []) as unknown as Array<{ ciudad?: { nombre?: string; pais_codigo?: string } }>)
            .map((r) => {
              const ciudad = r.ciudad;
              if (!ciudad?.nombre) return null;
              const bandera = ciudad.pais_codigo
                ? [...ciudad.pais_codigo.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
                : '🌍';
              return `${bandera} ${ciudad.nombre}`;
            })
            .filter(Boolean) as string[])
        : [],
    contactos:
      contactosR.status === 'fulfilled'
        ? ((contactosR.value.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
            ...r,
            tipo_contacto: Array.isArray(r.tipo_contacto) ? (r.tipo_contacto[0] ?? null) : r.tipo_contacto,
          }))
        : [],
  };

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'obtenerResidenteDetalleRaw', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/**
 * Proxy a la Edge Function `admin-usuarios` (Supabase-native) — no se
 * reimplementa acá la lógica de creación de cuenta (auth.admin.createUser +
 * residente + perfil con rollback), ya está probada y usa el mismo modelo de
 * seguridad. Se reenvía el token del usuario que llama, tal cual llegó a este
 * backend, porque la Edge Function valida ella misma el rol del caller.
 */
export async function invocarAdminUsuarios(callerToken: string, body: Record<string, unknown>): Promise<{ id?: string; username?: string; ok?: boolean }> {
  logger.info('repo:call', { repository: 'residentsRepository', action: 'invocarAdminUsuarios', accion: body.accion });
  try {
  const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${callerToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string; username?: string; ok?: boolean };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Error al invocar la función de administración de usuarios');
  return data;

  } catch (err) {
    logger.error('repo:error', { repository: 'residentsRepository', action: 'invocarAdminUsuarios', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
