import { getSupabaseAdmin } from './supabaseAdmin';
import { env } from '../config/env';
import { logger } from '../logging/logger';
import { withRepoLogging } from '../logging/repoLogger';
import { coincideBusqueda } from '../utils/textSearch';

/** Resuelve la organización de un residente — la necesitan Actividades y Clima para filtrar por org. */
export const getOrganizacionIdDeResidente = withRepoLogging('residentsRepository', 'getOrganizacionIdDeResidente', async (residenteId: string): Promise<string | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver la organización del residente: ${error.message}`);
  return data?.organizacion_id ?? null;
});

export interface ResidenteContext {
  organizacionId: string | null;
  seccion: string | null;
}

/** Organización + sección del residente — la necesita Actividades para el algoritmo de visibilidad. */
export const getResidenteContext = withRepoLogging('residentsRepository', 'getResidenteContext', async (residenteId: string): Promise<ResidenteContext> => {
  const { data, error } = await getSupabaseAdmin()
    .from('residentes')
    .select('organizacion_id, seccion')
    .eq('id', residenteId)
    .maybeSingle();

  if (error) throw new Error(`Error al resolver el residente: ${error.message}`);
  return { organizacionId: data?.organizacion_id ?? null, seccion: data?.seccion ?? null };
});

// ─── Admin (backoffice) ──────────────────────────────────────────────────────
// Porteo de `backoffice/src/services/residentesService.ts`.

export type TipoCelular = 'android' | 'iphone' | 'no_especificado';

export interface Residente {
  id: string;
  organizacion_id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string | null;
  tipo_celular: TipoCelular;
  fecha_nacimiento: string | null;
  nivel_dificultad: string;
  seccion: string | null;
  /** Puesto del empleado de Ledor Vador — null para residentes (o si la migración aún no se aplicó). */
  rol_empleado?: string | null;
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

export type ResidenteConCuenta = Residente & { tiene_cuenta: boolean; intereses_ids: string[] };

export interface ResidenteBusquedaResumen {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string | null;
  foto_url: string | null;
}

/**
 * Busca residentes activos de la organización por nombre/apellido — solo devuelve
 * los que tienen cuenta (`perfiles_usuario`), porque un residente sin cuenta nunca
 * va a poder loguearse a leer un mensaje. Usado por Hablemos para "buscar usuarios".
 */
export const buscarPorNombreConCuenta = withRepoLogging('residentsRepository', 'buscarPorNombreConCuenta', async (
  organizacionId: string,
  query: string,
  excluirResidenteId: string,
): Promise<ResidenteBusquedaResumen[]> => {
  // Nota: "foto_url" todavía no existe en la tabla `residentes` de esta base
  // (pendiente de una migración previa sin aplicar, ajena a Hablemos) — se
  // completa en null acá para no romper la búsqueda mientras tanto.
  //
  // El filtro por nombre se hace en JS (no con ILIKE en la query) para poder
  // ignorar tildes — Postgres ILIKE no lo hace sin la extensión `unaccent`,
  // que no está garantizada en este proyecto. Con esto además, una búsqueda
  // vacía devuelve la lista completa (para mostrar "todos" antes de escribir).
  const [residentesR, perfilesR] = await Promise.allSettled([
    getSupabaseAdmin()
      .from('residentes')
      .select('id, nombre, apellido, nombre_completo')
      .eq('organizacion_id', organizacionId)
      .eq('activo', true)
      .neq('id', excluirResidenteId)
      .order('apellido', { ascending: true })
      .limit(300),
    getSupabaseAdmin().from('perfiles_usuario').select('residente_id').eq('organizacion_id', organizacionId).not('residente_id', 'is', null),
  ]);

  if (residentesR.status === 'rejected') throw new Error(`Error al buscar residentes: ${String(residentesR.reason)}`);
  if (residentesR.value.error) throw new Error(`Error al buscar residentes: ${residentesR.value.error.message}`);

  const conCuentaIds = new Set(
    perfilesR.status === 'fulfilled' ? ((perfilesR.value.data ?? []) as { residente_id: string }[]).map((p) => p.residente_id) : [],
  );

  return ((residentesR.value.data ?? []) as Array<Omit<ResidenteBusquedaResumen, 'foto_url'>>)
    .filter((r) => conCuentaIds.has(r.id))
    // Matchea contra nombre+apellido Y contra nombre_completo (si está cargado),
    // así buscar por cualquiera de los dos encuentra al residente.
    .filter((r) => coincideBusqueda(`${r.nombre} ${r.apellido} ${r.nombre_completo ?? ''}`, query))
    .slice(0, 50)
    .map((r) => ({ ...r, foto_url: null }));
});

/** Nombre completo de un residente — usado por Hablemos para el título de las notificaciones push. */
export const obtenerNombreCompleto = withRepoLogging('residentsRepository', 'obtenerNombreCompleto', async (id: string): Promise<{ nombre: string; apellido: string; nombre_completo: string | null } | null> => {
  const { data, error } = await getSupabaseAdmin().from('residentes').select('nombre, apellido, nombre_completo').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar el residente: ${error.message}`);
  return data ?? null;
});

export const listarResidentesAdmin = withRepoLogging('residentsRepository', 'listarResidentesAdmin', async (organizacionId: string): Promise<ResidenteConCuenta[]> => {
  const [residentesR, perfilesR, interesesR] = await Promise.allSettled([
    getSupabaseAdmin().from('residentes').select('*').eq('organizacion_id', organizacionId).order('apellido', { ascending: true }),
    getSupabaseAdmin().from('perfiles_usuario').select('residente_id').eq('organizacion_id', organizacionId).not('residente_id', 'is', null),
    getSupabaseAdmin()
      .from('residente_intereses')
      .select('residente_id, interes_id, residente:residentes!inner(organizacion_id)')
      .eq('residente.organizacion_id', organizacionId),
  ]);

  if (residentesR.status === 'rejected') throw new Error(`Error al cargar residentes: ${String(residentesR.reason)}`);
  if (residentesR.value.error) throw new Error(`Error al cargar residentes: ${residentesR.value.error.message}`);

  const verificadosIds = new Set(
    perfilesR.status === 'fulfilled' ? ((perfilesR.value.data ?? []) as { residente_id: string }[]).map((p) => p.residente_id) : [],
  );

  // Intereses de cada usuario (para pre-cargarlos al editar). Best-effort: si
  // la consulta falla, la lista se muestra igual, solo sin intereses.
  const interesesPorResidente = new Map<string, string[]>();
  if (interesesR.status === 'fulfilled' && !interesesR.value.error) {
    for (const fila of (interesesR.value.data ?? []) as Array<{ residente_id: string; interes_id: string }>) {
      const lista = interesesPorResidente.get(fila.residente_id) ?? [];
      lista.push(fila.interes_id);
      interesesPorResidente.set(fila.residente_id, lista);
    }
  } else {
    const motivo = interesesR.status === 'rejected' ? String(interesesR.reason) : interesesR.value.error?.message;
    logger.warn('repo:warn', { repository: 'residentsRepository', action: 'listarResidentesAdmin', detalle: `No se pudieron cargar los intereses: ${motivo}` });
  }

  return ((residentesR.value.data ?? []) as Residente[]).map((r) => ({
    ...r,
    tiene_cuenta: verificadosIds.has(r.id),
    intereses_ids: interesesPorResidente.get(r.id) ?? [],
  }));
});

export interface ResidenteAdminInput {
  nombre: string;
  apellido: string;
  seccion?: string | null;
  notas?: string | null;
  nombre_completo?: string | null;
  tipo_celular?: TipoCelular;
  rol_empleado?: string | null;
  intereses?: string[];
}

/** ¿El error de Postgres/PostgREST es porque la columna `rol_empleado` todavía no existe? */
function faltaColumnaRolEmpleado(mensaje: string | undefined): boolean {
  return !!mensaje && mensaje.includes('rol_empleado');
}

export const actualizarResidenteAdmin = withRepoLogging('residentsRepository', 'actualizarResidenteAdmin', async (id: string, input: ResidenteAdminInput): Promise<void> => {
  const { intereses, ...campos } = input;
  const cambios = { ...campos, updated_at: new Date().toISOString() };
  let { error } = await getSupabaseAdmin().from('residentes').update(cambios).eq('id', id);
  // Si la migración 20261013120000_residentes_rol_empleado todavía no se
  // aplicó, se guarda todo lo demás igual en vez de fallar la edición entera.
  if (error && 'rol_empleado' in cambios && faltaColumnaRolEmpleado(error.message)) {
    logger.warn('repo:warn', { repository: 'residentsRepository', action: 'actualizarResidenteAdmin', detalle: 'Falta la columna residentes.rol_empleado — aplicar la migración 20261013120000. Se guarda sin el rol.' });
    const { rol_empleado: _omitido, ...sinRol } = cambios;
    ({ error } = await getSupabaseAdmin().from('residentes').update(sinRol).eq('id', id));
  }
  if (error) throw new Error(`Error al actualizar residente: ${error.message}`);

  if (intereses !== undefined) await reemplazarIntereses(id, intereses);
});

/**
 * Detecta y guarda solo el tipo de celular a partir de la plataforma real del
 * dispositivo (se llama desde el registro del token de notificaciones push,
 * que ya pasa la plataforma en cada apertura de la app) — nunca hace falta
 * que el staff lo cargue a mano al crear un usuario. "web" no es un celular,
 * así que se ignora (no pisa un valor ya detectado).
 */
export async function actualizarTipoCelularDetectado(residenteId: string, plataforma: 'ios' | 'android' | 'web'): Promise<void> {
  if (plataforma === 'web') return;
  const tipoCelular: TipoCelular = plataforma === 'ios' ? 'iphone' : 'android';
  logger.info('repo:call', { repository: 'residentsRepository', action: 'actualizarTipoCelularDetectado', residenteId, tipoCelular });
  try {
    const { error } = await getSupabaseAdmin()
      .from('residentes')
      .update({ tipo_celular: tipoCelular })
      .eq('id', residenteId)
      .neq('tipo_celular', tipoCelular); // evita un UPDATE (y su trigger de updated_at) si no cambió nada
    if (error) throw new Error(`Error al detectar el tipo de celular: ${error.message}`);
  } catch (err) {
    // Best-effort: nunca debe romper el registro del push token por esto.
    logger.error('repo:error', { repository: 'residentsRepository', action: 'actualizarTipoCelularDetectado', error: err instanceof Error ? err.message : String(err) });
  }
}

/** Reemplaza los intereses del residente por exactamente `interesesIds`. */
export const reemplazarIntereses = withRepoLogging('residentsRepository', 'reemplazarIntereses', async (residenteId: string, interesesIds: string[]): Promise<void> => {
    const unicos = [...new Set(interesesIds)];
    const { error: delError } = await getSupabaseAdmin().from('residente_intereses').delete().eq('residente_id', residenteId);
    if (delError) throw new Error(`Error al actualizar los intereses: ${delError.message}`);
    if (unicos.length === 0) return;
    const { error: insError } = await getSupabaseAdmin()
      .from('residente_intereses')
      .insert(unicos.map((interes_id) => ({ residente_id: residenteId, interes_id })));
    if (insError) throw new Error(`Error al guardar los intereses: ${insError.message}`);
});

/**
 * Elimina definitivamente al usuario: la fila de `residentes` (sus datos
 * dependientes se borran en cascada) y su cuenta de Supabase Auth (que a su
 * vez borra `perfiles_usuario`). Primero el residente: si algo lo impide, no
 * se toca la cuenta y no queda nada a medio borrar.
 */
export const eliminarResidenteAdmin = withRepoLogging('residentsRepository', 'eliminarResidenteAdmin', async (id: string, organizacionId: string): Promise<{ nombre: string } | null> => {
    const admin = getSupabaseAdmin();
    const { data: residente, error: findError } = await admin
      .from('residentes')
      .select('id, nombre, apellido')
      .eq('id', id)
      .eq('organizacion_id', organizacionId)
      .maybeSingle();
    if (findError) throw new Error(`Error al buscar el usuario: ${findError.message}`);
    if (!residente) return null;

    const { data: perfiles, error: perfilesError } = await admin.from('perfiles_usuario').select('id').eq('residente_id', id);
    if (perfilesError) throw new Error(`Error al buscar la cuenta del usuario: ${perfilesError.message}`);

    const { error: delError } = await admin.from('residentes').delete().eq('id', id);
    if (delError) {
      throw new Error(
        delError.code === '23503'
          ? 'No se puede eliminar: el usuario tiene datos asociados que lo impiden. Podés desactivarlo en su lugar.'
          : `Error al eliminar el usuario: ${delError.message}`,
      );
    }

    for (const perfil of (perfiles ?? []) as Array<{ id: string }>) {
      const { error: authError } = await admin.auth.admin.deleteUser(perfil.id);
      if (authError) {
        // El residente ya no existe: la cuenta queda sin residente asociado y no
        // aparece en ningún listado. Se registra para limpiarla a mano si hace falta.
        logger.error('repo:error', { repository: 'residentsRepository', action: 'eliminarResidenteAdmin', detalle: `No se pudo borrar la cuenta de auth ${perfil.id}: ${authError.message}` });
      }
    }

    return { nombre: `${residente.nombre} ${residente.apellido}` };
});

export const setActivoResidenteAdmin = withRepoLogging('residentsRepository', 'setActivoResidenteAdmin', async (id: string, activo: boolean): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('residentes')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar residente: ${error.message}`);
});

export const obtenerResidenteAdmin = withRepoLogging('residentsRepository', 'obtenerResidenteAdmin', async (id: string): Promise<Residente | null> => {
  const { data, error } = await getSupabaseAdmin().from('residentes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar residente: ${error.message}`);
  return (data as Residente) ?? null;
});

export interface ResidenteDetalleRaw {
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { id: string; nombre: string; emoji: string | null }[];
  /** Todo tutorial que el residente abrió (completado o no), el más reciente primero. */
  tutoriales: { titulo: string; thumbnail_url: string | null; completado: boolean; favorito: boolean; ultima_vista: string | null }[];
  sugerencias: { id: string; tipo: string; titulo: string; estado: string; created_at: string }[];
  agenda: { id: string; titulo: string; fecha: string; hora: string; estado: string }[];
  /** Avance en los modos de niveles (Jardín y Palabras): cuántos niveles completó y cuántas estrellas juntó. */
  progresoNiveles: { jardin: { niveles: number; estrellas: number }; palabras: { niveles: number; nivelMaximo: number } };
  hablemosMensajesEnviados: number;
  ciudadesClima: string[];
  contactos: Array<Record<string, unknown>>;
  /** Modelo real del último dispositivo que registró un token de push — ej. "samsung SM-A356E" o "iPhone 13". null si nunca abrió la app. */
  dispositivoDetectado: { modelo: string | null; plataforma: string; ultimaConexion: string } | null;
}

export const obtenerResidenteDetalleRaw = withRepoLogging('residentsRepository', 'obtenerResidenteDetalleRaw', async (id: string): Promise<ResidenteDetalleRaw> => {
  const [mensajesR, interesesR, tutorialesR, climaR, contactosR, dispositivoR, sugerenciasR, agendaR, jardinR, palabrasR, hablemosR] = await Promise.allSettled([
    getSupabaseAdmin()
      .from('mensajes_asistente')
      .select('id, contenido, created_at')
      .eq('residente_id', id)
      .eq('rol', 'usuario')
      .order('created_at', { ascending: false })
      .limit(20),
    getSupabaseAdmin().from('residente_intereses').select('interes:intereses(id, nombre, emoji)').eq('residente_id', id),
    getSupabaseAdmin()
      .from('progreso_tutorial')
      .select('tutorial:tutoriales(titulo, thumbnail_url), completado, favorito, ultima_vista, updated_at')
      .eq('residente_id', id)
      .order('updated_at', { ascending: false })
      .limit(100),
    getSupabaseAdmin().from('residente_ciudades_familiares').select('ciudad:ciudades_familiares(nombre, pais_codigo)').eq('residente_id', id),
    getSupabaseAdmin()
      .from('contactos')
      .select('id, nombre, apellido, telefono, whatsapp_disponible, foto_url, favorito, orden, tipo_contacto:tipos_contacto(id, nombre, emoji)')
      .eq('residente_id', id)
      .eq('activo', true)
      .order('favorito', { ascending: false })
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
    getSupabaseAdmin()
      .from('device_tokens')
      .select('dispositivo, plataforma, last_seen_at')
      .eq('residente_id', id)
      .eq('activo', true)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSupabaseAdmin()
      .from('pedidos_sugerencias')
      .select('id, tipo, titulo, estado, created_at')
      .eq('residente_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    getSupabaseAdmin()
      .from('agenda_recordatorios')
      .select('id, titulo, fecha, hora, estado')
      .eq('residente_id', id)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .limit(50),
    getSupabaseAdmin().from('jardin_niveles_progreso').select('nivel, estrellas').eq('residente_id', id),
    getSupabaseAdmin().from('palabras_niveles_progreso').select('nivel').eq('residente_id', id),
    getSupabaseAdmin().from('mensajes_hablemos').select('id', { count: 'exact', head: true }).eq('remitente_id', id),
  ]);

  const filas = <T>(r: PromiseSettledResult<{ data: unknown }>): T[] => (r.status === 'fulfilled' ? ((r.value.data ?? []) as T[]) : []);
  const jardin = filas<{ nivel: number; estrellas: number }>(jardinR);
  const palabras = filas<{ nivel: number }>(palabrasR);

  return {
    mensajes: mensajesR.status === 'fulfilled' ? ((mensajesR.value.data ?? []) as ResidenteDetalleRaw['mensajes']) : [],
    intereses:
      interesesR.status === 'fulfilled'
        ? (((interesesR.value.data ?? []) as unknown as Array<{ interes?: { id: string; nombre: string; emoji: string | null } | null }>)
            .map((r) => r.interes)
            .filter(Boolean) as ResidenteDetalleRaw['intereses'])
        : [],
    tutoriales:
      tutorialesR.status === 'fulfilled'
        ? ((tutorialesR.value.data ?? []) as unknown as Array<{
            tutorial?: { titulo?: string; thumbnail_url?: string | null };
            completado: boolean;
            favorito: boolean;
            ultima_vista: string | null;
            updated_at: string;
          }>)
            .map((r) => ({
              titulo: r.tutorial?.titulo ?? '',
              thumbnail_url: r.tutorial?.thumbnail_url ?? null,
              completado: r.completado,
              favorito: r.favorito,
              ultima_vista: r.ultima_vista ?? r.updated_at,
            }))
            .filter((r) => r.titulo)
        : [],
    sugerencias: filas<ResidenteDetalleRaw['sugerencias'][number]>(sugerenciasR),
    agenda: filas<ResidenteDetalleRaw['agenda'][number]>(agendaR),
    progresoNiveles: {
      jardin: { niveles: jardin.length, estrellas: jardin.reduce((suma, f) => suma + f.estrellas, 0) },
      palabras: { niveles: palabras.length, nivelMaximo: palabras.reduce((max, f) => Math.max(max, f.nivel), 0) },
    },
    hablemosMensajesEnviados: hablemosR.status === 'fulfilled' ? (hablemosR.value.count ?? 0) : 0,
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
    dispositivoDetectado:
      dispositivoR.status === 'fulfilled' && dispositivoR.value.data
        ? {
            modelo: (dispositivoR.value.data as { dispositivo: string | null }).dispositivo,
            plataforma: (dispositivoR.value.data as { plataforma: string }).plataforma,
            ultimaConexion: (dispositivoR.value.data as { last_seen_at: string }).last_seen_at,
          }
        : null,
  };
});

/**
 * Proxy a la Edge Function `admin-usuarios` (Supabase-native) — no se
 * reimplementa acá la lógica de creación de cuenta (auth.admin.createUser +
 * residente + perfil con rollback), ya está probada y usa el mismo modelo de
 * seguridad. Se reenvía el token del usuario que llama, tal cual llegó a este
 * backend, porque la Edge Function valida ella misma el rol del caller.
 */
export const invocarAdminUsuarios = withRepoLogging('residentsRepository', 'invocarAdminUsuarios', async (callerToken: string, body: Record<string, unknown>): Promise<{ id?: string; username?: string; ok?: boolean }> => {
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
});

/** Marca la última vez que el residente abrió la app (la usa el backoffice para "última conexión"). */
export const registrarConexion = withRepoLogging('residentsRepository', 'registrarConexion', async (residenteId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('residentes').update({ ultima_conexion: new Date().toISOString() }).eq('id', residenteId);
  if (error) throw new Error(`Error al registrar la conexión: ${error.message}`);
});
