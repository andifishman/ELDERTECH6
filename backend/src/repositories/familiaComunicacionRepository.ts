import { withRepoLogging } from '../logging/repoLogger';
import { getSupabaseAdmin } from './supabaseAdmin';

const REPO = 'familiaComunicacionRepository';

function falla(accion: string, error: { message: string }): never {
  throw new Error(`Error al ${accion}: ${error.message}`);
}

// ─── Mensajes familiar ↔ residente ───────────────────────────────────────────

export type AutorMensaje = 'familiar' | 'residente';

export interface Mensaje {
  id: string;
  vinculo_id: string;
  autor: AutorMensaje;
  contenido: string | null;
  imagen_path: string | null;
  leido_en: string | null;
  created_at: string;
}

export interface ResumenHilo {
  vinculo_id: string;
  ultimo: Mensaje | null;
  sin_leer: number;
}

const COLUMNAS_MENSAJE = 'id, vinculo_id, autor, contenido, imagen_path, leido_en, created_at';

/** Último mensaje y cantidad sin leer de cada hilo. `leeAutor` = quién lee: cuenta los mensajes del OTRO. */
export const resumirHilos = withRepoLogging(REPO, 'resumirHilos', async (vinculoIds: string[], leeAutor: AutorMensaje): Promise<ResumenHilo[]> => {
  if (vinculoIds.length === 0) return [];
  const db = getSupabaseAdmin();
  const otro: AutorMensaje = leeAutor === 'familiar' ? 'residente' : 'familiar';

  const { data: sinLeer, error } = await db.from('familia_mensajes').select('vinculo_id').in('vinculo_id', vinculoIds).eq('autor', otro).is('leido_en', null);
  if (error) falla('contar los mensajes sin leer', error);
  const conteo = new Map<string, number>();
  for (const f of (sinLeer ?? []) as Array<{ vinculo_id: string }>) conteo.set(f.vinculo_id, (conteo.get(f.vinculo_id) ?? 0) + 1);

  return Promise.all(
    vinculoIds.map(async (vinculoId) => {
      const { data, error: errorUltimo } = await db.from('familia_mensajes').select(COLUMNAS_MENSAJE).eq('vinculo_id', vinculoId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (errorUltimo) falla('cargar el último mensaje', errorUltimo);
      return { vinculo_id: vinculoId, ultimo: (data as Mensaje | null) ?? null, sin_leer: conteo.get(vinculoId) ?? 0 };
    }),
  );
});

/** Los últimos `limite` mensajes del hilo, del más viejo al más nuevo. */
export const listarMensajes = withRepoLogging(REPO, 'listarMensajes', async (vinculoId: string, limite?: number): Promise<Mensaje[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_mensajes').select(COLUMNAS_MENSAJE).eq('vinculo_id', vinculoId).order('created_at', { ascending: false }).limit(limite ?? 100);
  if (error) falla('cargar los mensajes', error);
  return ((data ?? []) as Mensaje[]).reverse();
});

export const crearMensaje = withRepoLogging(
  REPO,
  'crearMensaje',
  async (vinculoId: string, autor: AutorMensaje, contenido: string | null, imagenPath: string | null): Promise<Mensaje> => {
    const { data, error } = await getSupabaseAdmin().from('familia_mensajes').insert({ vinculo_id: vinculoId, autor, contenido, imagen_path: imagenPath }).select(COLUMNAS_MENSAJE).single();
    if (error) falla('enviar el mensaje', error);
    return data as Mensaje;
  },
);

/** Marca como leídos los mensajes que escribió el OTRO lado. */
export const marcarLeidos = withRepoLogging(REPO, 'marcarLeidos', async (vinculoId: string, leeAutor: AutorMensaje): Promise<void> => {
  const otro: AutorMensaje = leeAutor === 'familiar' ? 'residente' : 'familiar';
  const { error } = await getSupabaseAdmin().from('familia_mensajes').update({ leido_en: new Date().toISOString() }).eq('vinculo_id', vinculoId).eq('autor', otro).is('leido_en', null);
  if (error) falla('marcar los mensajes como leídos', error);
});

/** Hilos de un residente: sus vínculos activos con el nombre del familiar. */
export const listarVinculosDeResidente = withRepoLogging(
  REPO,
  'listarVinculosDeResidente',
  async (organizacionId: string, residenteId: string): Promise<Array<{ vinculo_id: string; parentesco: string | null; familiar_nombre: string; familiar_apellido: string }>> => {
    const { data, error } = await getSupabaseAdmin()
      .from('vinculos_familiares')
      .select('id, parentesco, familiar:familiares!inner(nombre, apellido, activo)')
      .eq('organizacion_id', organizacionId)
      .eq('residente_id', residenteId)
      .eq('activo', true)
      .eq('familiar.activo', true);
    if (error) falla('cargar los familiares del residente', error);
    const filas = (data ?? []) as unknown as Array<{ id: string; parentesco: string | null; familiar: { nombre: string; apellido: string } | null }>;
    return filas.flatMap((f) => (f.familiar ? [{ vinculo_id: f.id, parentesco: f.parentesco, familiar_nombre: f.familiar.nombre, familiar_apellido: f.familiar.apellido }] : []));
  },
);

// ─── Categorías de consulta ──────────────────────────────────────────────────

export interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
  orden: number;
}

const CATEGORIAS_POR_DEFECTO = ['Consulta general', 'Pedido', 'Administración', 'Otro'];

export const listarCategorias = withRepoLogging(REPO, 'listarCategorias', async (organizacionId: string, soloActivas: boolean): Promise<Categoria[]> => {
  const db = getSupabaseAdmin();
  const leer = async (): Promise<Categoria[]> => {
    let query = db.from('familia_categorias').select('id, nombre, activa, orden').eq('organizacion_id', organizacionId).order('orden', { ascending: true }).order('nombre', { ascending: true });
    if (soloActivas) query = query.eq('activa', true);
    const { data, error } = await query;
    if (error) falla('cargar las categorías', error);
    return (data ?? []) as Categoria[];
  };
  const categorias = await leer();
  if (categorias.length > 0) return categorias;
  // Una institución nueva (creada después de la migración) arranca con las categorías por defecto.
  const { count, error } = await db.from('familia_categorias').select('id', { count: 'exact', head: true }).eq('organizacion_id', organizacionId);
  if (error) falla('cargar las categorías', error);
  if ((count ?? 0) > 0) return categorias;
  const { error: errorAlta } = await db
    .from('familia_categorias')
    .upsert(CATEGORIAS_POR_DEFECTO.map((nombre, i) => ({ organizacion_id: organizacionId, nombre, orden: i + 1 })), { onConflict: 'organizacion_id,nombre', ignoreDuplicates: true });
  if (errorAlta) falla('crear las categorías por defecto', errorAlta);
  return leer();
});

export const obtenerCategoria = withRepoLogging(REPO, 'obtenerCategoria', async (id: string, organizacionId: string): Promise<Categoria | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_categorias').select('id, nombre, activa, orden').eq('id', id).eq('organizacion_id', organizacionId).maybeSingle();
  if (error) falla('cargar la categoría', error);
  return (data as Categoria | null) ?? null;
});

/** null si ya hay una con ese nombre (sin distinguir mayúsculas). */
export const crearCategoria = withRepoLogging(REPO, 'crearCategoria', async (organizacionId: string, nombre: string): Promise<Categoria | null> => {
  const { count } = await getSupabaseAdmin().from('familia_categorias').select('id', { count: 'exact', head: true }).eq('organizacion_id', organizacionId);
  const { data, error } = await getSupabaseAdmin()
    .from('familia_categorias')
    .insert({ organizacion_id: organizacionId, nombre, orden: (count ?? 0) + 1 })
    .select('id, nombre, activa, orden')
    .single();
  if (error?.code === '23505') return null;
  if (error) falla('crear la categoría', error);
  return data as Categoria;
});

export const actualizarCategoria = withRepoLogging(
  REPO,
  'actualizarCategoria',
  async (id: string, organizacionId: string, cambios: { nombre?: string; activa?: boolean }): Promise<Categoria | 'duplicada' | null> => {
    const { data, error } = await getSupabaseAdmin().from('familia_categorias').update(cambios).eq('id', id).eq('organizacion_id', organizacionId).select('id, nombre, activa, orden').maybeSingle();
    if (error?.code === '23505') return 'duplicada';
    if (error) falla('actualizar la categoría', error);
    return (data as Categoria | null) ?? null;
  },
);

// ─── Consultas, sugerencias y reclamos ───────────────────────────────────────

export type TipoCaso = 'consulta' | 'sugerencia' | 'reclamo';
export type EstadoCaso = 'pendiente' | 'en_proceso' | 'resuelta';

export interface Caso {
  id: string;
  organizacion_id: string;
  familiar_id: string;
  residente_id: string | null;
  tipo: TipoCaso;
  categoria_id: string | null;
  asunto: string;
  descripcion: string;
  estado: EstadoCaso;
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface CasoConDatos extends Caso {
  categoria_nombre: string | null;
  residente_nombre: string | null;
  familiar_nombre: string | null;
  cantidad_respuestas: number;
}

export interface MensajeCaso {
  id: string;
  caso_id: string;
  autor: 'familiar' | 'personal';
  texto: string;
  created_at: string;
}

const COLUMNAS_CASO =
  'id, organizacion_id, familiar_id, residente_id, tipo, categoria_id, asunto, descripcion, estado, resuelto_en, created_at, updated_at, categoria:familia_categorias(nombre), residente:residentes(nombre, apellido), familiar:familiares(nombre, apellido), respuestas:familia_caso_mensajes(count)';

type FilaCaso = Caso & {
  categoria: { nombre: string } | null;
  residente: { nombre: string; apellido: string } | null;
  familiar: { nombre: string; apellido: string } | null;
  respuestas: Array<{ count: number }>;
};

function aCasoConDatos({ categoria, residente, familiar, respuestas, ...caso }: FilaCaso): CasoConDatos {
  return {
    ...caso,
    categoria_nombre: categoria?.nombre ?? null,
    residente_nombre: residente ? `${residente.nombre} ${residente.apellido}`.trim() : null,
    familiar_nombre: familiar ? `${familiar.nombre} ${familiar.apellido}`.trim() : null,
    cantidad_respuestas: respuestas?.[0]?.count ?? 0,
  };
}

export const listarCasosDeFamiliar = withRepoLogging(REPO, 'listarCasosDeFamiliar', async (familiarId: string): Promise<CasoConDatos[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_casos').select(COLUMNAS_CASO).eq('familiar_id', familiarId).order('created_at', { ascending: false }).limit(100);
  if (error) falla('cargar tus consultas', error);
  return ((data ?? []) as unknown as FilaCaso[]).map(aCasoConDatos);
});

export const listarCasosAdmin = withRepoLogging(REPO, 'listarCasosAdmin', async (organizacionId: string): Promise<CasoConDatos[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_casos').select(COLUMNAS_CASO).eq('organizacion_id', organizacionId).order('created_at', { ascending: false }).limit(300);
  if (error) falla('cargar las consultas', error);
  return ((data ?? []) as unknown as FilaCaso[]).map(aCasoConDatos);
});

export const obtenerCaso = withRepoLogging(REPO, 'obtenerCaso', async (id: string): Promise<CasoConDatos | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_casos').select(COLUMNAS_CASO).eq('id', id).maybeSingle();
  if (error) falla('cargar la consulta', error);
  return data ? aCasoConDatos(data as unknown as FilaCaso) : null;
});

export const crearCaso = withRepoLogging(
  REPO,
  'crearCaso',
  async (input: { organizacionId: string; familiarId: string; residenteId: string | null; tipo: TipoCaso; categoriaId: string | null; asunto: string; descripcion: string }): Promise<string> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_casos')
      .insert({
        organizacion_id: input.organizacionId,
        familiar_id: input.familiarId,
        residente_id: input.residenteId,
        tipo: input.tipo,
        categoria_id: input.categoriaId,
        asunto: input.asunto,
        descripcion: input.descripcion,
      })
      .select('id')
      .single();
    if (error) falla('enviar la consulta', error);
    return (data as { id: string }).id;
  },
);

export const listarMensajesCaso = withRepoLogging(REPO, 'listarMensajesCaso', async (casoId: string): Promise<MensajeCaso[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_caso_mensajes').select('id, caso_id, autor, texto, created_at').eq('caso_id', casoId).order('created_at', { ascending: true });
  if (error) falla('cargar las respuestas', error);
  return (data ?? []) as MensajeCaso[];
});

export const crearMensajeCaso = withRepoLogging(REPO, 'crearMensajeCaso', async (casoId: string, autor: 'familiar' | 'personal', autorId: string, texto: string): Promise<MensajeCaso> => {
  const { data, error } = await getSupabaseAdmin().from('familia_caso_mensajes').insert({ caso_id: casoId, autor, autor_id: autorId, texto }).select('id, caso_id, autor, texto, created_at').single();
  if (error) falla('enviar la respuesta', error);
  return data as MensajeCaso;
});

export const cambiarEstadoCaso = withRepoLogging(REPO, 'cambiarEstadoCaso', async (id: string, estado: EstadoCaso, usuarioId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('familia_casos')
    .update(estado === 'resuelta' ? { estado, resuelto_por: usuarioId, resuelto_en: new Date().toISOString() } : { estado, resuelto_por: null, resuelto_en: null })
    .eq('id', id);
  if (error) falla('actualizar el estado', error);
});

// ─── Propuestas de actividades ───────────────────────────────────────────────

export type EstadoPropuesta = 'pendiente' | 'en_revision' | 'aceptada' | 'no_posible';

export interface Propuesta {
  id: string;
  organizacion_id: string;
  familiar_id: string;
  tipo: 'proponer' | 'ofrecerse';
  titulo: string;
  descripcion: string;
  estado: EstadoPropuesta;
  respuesta: string | null;
  respondido_en: string | null;
  created_at: string;
  familiar_nombre?: string | null;
}

const COLUMNAS_PROPUESTA = 'id, organizacion_id, familiar_id, tipo, titulo, descripcion, estado, respuesta, respondido_en, created_at';

export const listarPropuestasDeFamiliar = withRepoLogging(REPO, 'listarPropuestasDeFamiliar', async (familiarId: string): Promise<Propuesta[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_propuestas').select(COLUMNAS_PROPUESTA).eq('familiar_id', familiarId).order('created_at', { ascending: false }).limit(100);
  if (error) falla('cargar tus propuestas', error);
  return (data ?? []) as Propuesta[];
});

export const listarPropuestasAdmin = withRepoLogging(REPO, 'listarPropuestasAdmin', async (organizacionId: string): Promise<Propuesta[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_propuestas')
    .select(`${COLUMNAS_PROPUESTA}, familiar:familiares(nombre, apellido)`)
    .eq('organizacion_id', organizacionId)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) falla('cargar las propuestas', error);
  const filas = (data ?? []) as unknown as Array<Propuesta & { familiar: { nombre: string; apellido: string } | null }>;
  return filas.map(({ familiar, ...p }) => ({ ...p, familiar_nombre: familiar ? `${familiar.nombre} ${familiar.apellido}`.trim() : null }));
});

export const crearPropuesta = withRepoLogging(
  REPO,
  'crearPropuesta',
  async (input: { organizacionId: string; familiarId: string; tipo: 'proponer' | 'ofrecerse'; titulo: string; descripcion: string }): Promise<Propuesta> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_propuestas')
      .insert({ organizacion_id: input.organizacionId, familiar_id: input.familiarId, tipo: input.tipo, titulo: input.titulo, descripcion: input.descripcion })
      .select(COLUMNAS_PROPUESTA)
      .single();
    if (error) falla('enviar la propuesta', error);
    return data as Propuesta;
  },
);

export const responderPropuesta = withRepoLogging(
  REPO,
  'responderPropuesta',
  async (id: string, organizacionId: string, usuarioId: string, estado: EstadoPropuesta, respuesta: string | null): Promise<Propuesta | null> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_propuestas')
      .update({ estado, respuesta, respondido_por: usuarioId, respondido_en: new Date().toISOString() })
      .eq('id', id)
      .eq('organizacion_id', organizacionId)
      .select(COLUMNAS_PROPUESTA)
      .maybeSingle();
    if (error) falla('responder la propuesta', error);
    return (data as Propuesta | null) ?? null;
  },
);
