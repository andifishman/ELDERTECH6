import { withRepoLogging } from '../logging/repoLogger';
import { getSupabaseAdmin } from './supabaseAdmin';

const REPO = 'familiaContenidoRepository';

function falla(accion: string, error: { message: string }): never {
  throw new Error(`Error al ${accion}: ${error.message}`);
}

// ─── Avisos con confirmación de lectura ──────────────────────────────────────

export interface Aviso {
  id: string;
  organizacion_id: string;
  titulo: string;
  texto: string;
  importante: boolean;
  publicar_en: string;
  created_at: string;
}

export interface AvisoParaFamiliar extends Aviso {
  leido: boolean;
  leido_en: string | null;
}

export interface AvisoAdmin extends Aviso {
  cantidad_lecturas: number;
  cantidad_familias: number;
}

export interface LecturaAviso {
  familiar_id: string;
  nombre: string;
  apellido: string;
  email: string;
  leido_en: string | null;
}

const COLUMNAS_AVISO = 'id, organizacion_id, titulo, texto, importante, publicar_en, created_at';

export const listarAvisosParaFamiliar = withRepoLogging(REPO, 'listarAvisosParaFamiliar', async (organizacionId: string, familiarId: string): Promise<AvisoParaFamiliar[]> => {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('familia_avisos')
    .select(COLUMNAS_AVISO)
    .eq('organizacion_id', organizacionId)
    .lte('publicar_en', new Date().toISOString())
    .order('publicar_en', { ascending: false })
    .limit(100);
  if (error) falla('cargar los avisos', error);
  const avisos = (data ?? []) as Aviso[];
  if (avisos.length === 0) return [];

  const { data: lecturas, error: errorLecturas } = await db
    .from('familia_aviso_lecturas')
    .select('aviso_id, leido_en')
    .eq('familiar_id', familiarId)
    .in('aviso_id', avisos.map((a) => a.id));
  if (errorLecturas) falla('cargar las lecturas', errorLecturas);
  const leidos = new Map(((lecturas ?? []) as Array<{ aviso_id: string; leido_en: string }>).map((l) => [l.aviso_id, l.leido_en]));
  return avisos.map((a) => ({ ...a, leido: leidos.has(a.id), leido_en: leidos.get(a.id) ?? null }));
});

/** Un aviso, solo si ya está publicado y es de esa institución. */
export const obtenerAvisoPublicado = withRepoLogging(REPO, 'obtenerAvisoPublicado', async (id: string, organizacionId: string): Promise<Aviso | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_avisos')
    .select(COLUMNAS_AVISO)
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .lte('publicar_en', new Date().toISOString())
    .maybeSingle();
  if (error) falla('cargar el aviso', error);
  return (data as Aviso | null) ?? null;
});

export const marcarAvisoLeido = withRepoLogging(REPO, 'marcarAvisoLeido', async (avisoId: string, familiarId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('familia_aviso_lecturas')
    .upsert({ aviso_id: avisoId, familiar_id: familiarId }, { onConflict: 'aviso_id,familiar_id', ignoreDuplicates: true });
  if (error) falla('confirmar la lectura', error);
});

async function contarFamiliasActivas(organizacionId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('familiares')
    .select('id', { count: 'exact', head: true })
    .eq('organizacion_id', organizacionId)
    .eq('activo', true);
  if (error) falla('contar las familias', error);
  return count ?? 0;
}

export const listarAvisosAdmin = withRepoLogging(REPO, 'listarAvisosAdmin', async (organizacionId: string): Promise<AvisoAdmin[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_avisos')
    .select(`${COLUMNAS_AVISO}, familia_aviso_lecturas(count)`)
    .eq('organizacion_id', organizacionId)
    .order('publicar_en', { ascending: false });
  if (error) falla('cargar los avisos', error);
  const total = await contarFamiliasActivas(organizacionId);
  const filas = (data ?? []) as unknown as Array<Aviso & { familia_aviso_lecturas: Array<{ count: number }> }>;
  return filas.map(({ familia_aviso_lecturas, ...a }) => ({ ...a, cantidad_lecturas: familia_aviso_lecturas?.[0]?.count ?? 0, cantidad_familias: total }));
});

export const obtenerAviso = withRepoLogging(REPO, 'obtenerAviso', async (id: string, organizacionId: string): Promise<Aviso | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_avisos').select(COLUMNAS_AVISO).eq('id', id).eq('organizacion_id', organizacionId).maybeSingle();
  if (error) falla('cargar el aviso', error);
  return (data as Aviso | null) ?? null;
});

export const crearAviso = withRepoLogging(
  REPO,
  'crearAviso',
  async (organizacionId: string, creadoPor: string, input: { titulo: string; texto: string; importante: boolean; publicarEn: string }): Promise<Aviso> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_avisos')
      .insert({ organizacion_id: organizacionId, titulo: input.titulo, texto: input.texto, importante: input.importante, publicar_en: input.publicarEn, creado_por: creadoPor })
      .select(COLUMNAS_AVISO)
      .single();
    if (error) falla('crear el aviso', error);
    return data as Aviso;
  },
);

export const actualizarAviso = withRepoLogging(
  REPO,
  'actualizarAviso',
  async (id: string, organizacionId: string, cambios: { titulo?: string; texto?: string; importante?: boolean; publicarEn?: string }): Promise<Aviso | null> => {
    const fila: Record<string, unknown> = {};
    if (cambios.titulo !== undefined) fila.titulo = cambios.titulo;
    if (cambios.texto !== undefined) fila.texto = cambios.texto;
    if (cambios.importante !== undefined) fila.importante = cambios.importante;
    if (cambios.publicarEn !== undefined) fila.publicar_en = cambios.publicarEn;
    const { data, error } = await getSupabaseAdmin().from('familia_avisos').update(fila).eq('id', id).eq('organizacion_id', organizacionId).select(COLUMNAS_AVISO).maybeSingle();
    if (error) falla('actualizar el aviso', error);
    return (data as Aviso | null) ?? null;
  },
);

export const eliminarAviso = withRepoLogging(REPO, 'eliminarAviso', async (id: string, organizacionId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('familia_avisos').delete().eq('id', id).eq('organizacion_id', organizacionId);
  if (error) falla('eliminar el aviso', error);
});

/** Todas las familias activas de la institución, con la hora en que confirmaron (null = todavía no lo leyó). */
export const listarLecturasAviso = withRepoLogging(REPO, 'listarLecturasAviso', async (avisoId: string, organizacionId: string): Promise<LecturaAviso[]> => {
  const db = getSupabaseAdmin();
  const { data: familias, error } = await db
    .from('familiares')
    .select('id, nombre, apellido, email')
    .eq('organizacion_id', organizacionId)
    .eq('activo', true)
    .order('apellido', { ascending: true });
  if (error) falla('cargar las familias', error);
  const { data: lecturas, error: errorLecturas } = await db.from('familia_aviso_lecturas').select('familiar_id, leido_en').eq('aviso_id', avisoId);
  if (errorLecturas) falla('cargar las lecturas', errorLecturas);
  const leidos = new Map(((lecturas ?? []) as Array<{ familiar_id: string; leido_en: string }>).map((l) => [l.familiar_id, l.leido_en]));
  return ((familias ?? []) as Array<{ id: string; nombre: string; apellido: string; email: string }>).map((f) => ({
    familiar_id: f.id,
    nombre: f.nombre,
    apellido: f.apellido,
    email: f.email,
    leido_en: leidos.get(f.id) ?? null,
  }));
});

// ─── Eventos abiertos a las familias ─────────────────────────────────────────

export interface Evento {
  id: string;
  organizacion_id: string;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  inicia_en: string;
  termina_en: string | null;
  abierto_inscripcion: boolean;
  cupo: number | null;
  created_at: string;
}

export interface EventoParaFamiliar extends Evento {
  /** Personas ya anotadas en total (para mostrar "quedan X lugares") */
  personas_inscriptas: number;
  mi_inscripcion: { personas: number } | null;
}

export interface Inscripcion {
  familiar_id: string;
  personas: number;
  created_at: string;
  nombre: string;
  apellido: string;
  email: string;
}

const COLUMNAS_EVENTO = 'id, organizacion_id, titulo, descripcion, lugar, inicia_en, termina_en, abierto_inscripcion, cupo, created_at';

async function inscripcionesPorEvento(ids: string[]): Promise<Array<{ evento_id: string; familiar_id: string; personas: number }>> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabaseAdmin().from('familia_evento_inscripciones').select('evento_id, familiar_id, personas').in('evento_id', ids);
  if (error) falla('cargar las inscripciones', error);
  return (data ?? []) as Array<{ evento_id: string; familiar_id: string; personas: number }>;
}

function conInscripciones(eventos: Evento[], filas: Array<{ evento_id: string; familiar_id: string; personas: number }>, familiarId: string | null): EventoParaFamiliar[] {
  return eventos.map((e) => {
    const propias = filas.filter((f) => f.evento_id === e.id);
    const mia = familiarId ? propias.find((f) => f.familiar_id === familiarId) : undefined;
    return { ...e, personas_inscriptas: propias.reduce((s, f) => s + f.personas, 0), mi_inscripcion: mia ? { personas: mia.personas } : null };
  });
}

/** Eventos desde `desde` (ISO) en adelante, hasta `hasta` si se pasa. */
export const listarEventos = withRepoLogging(
  REPO,
  'listarEventos',
  async (organizacionId: string, familiarId: string | null, desde: string, hasta?: string): Promise<EventoParaFamiliar[]> => {
    let query = getSupabaseAdmin().from('familia_eventos').select(COLUMNAS_EVENTO).eq('organizacion_id', organizacionId).gte('inicia_en', desde).order('inicia_en', { ascending: true }).limit(200);
    if (hasta) query = query.lte('inicia_en', hasta);
    const { data, error } = await query;
    if (error) falla('cargar los eventos', error);
    const eventos = (data ?? []) as Evento[];
    return conInscripciones(eventos, await inscripcionesPorEvento(eventos.map((e) => e.id)), familiarId);
  },
);

export const obtenerEvento = withRepoLogging(REPO, 'obtenerEvento', async (id: string, organizacionId: string): Promise<Evento | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_eventos').select(COLUMNAS_EVENTO).eq('id', id).eq('organizacion_id', organizacionId).maybeSingle();
  if (error) falla('cargar el evento', error);
  return (data as Evento | null) ?? null;
});

export type ResultadoInscripcion = 'ok' | 'sin_cupo' | 'cerrado';

/** Anota (o cambia la cantidad de personas) de forma atómica: la función de la base bloquea el evento al contar el cupo. */
export const inscribirEnEvento = withRepoLogging(REPO, 'inscribirEnEvento', async (eventoId: string, familiarId: string, personas: number): Promise<ResultadoInscripcion> => {
  const { data, error } = await getSupabaseAdmin().rpc('familia_inscribir_evento', { p_evento: eventoId, p_familiar: familiarId, p_personas: personas });
  if (error) falla('inscribirte al evento', error);
  return data as ResultadoInscripcion;
});

export const cancelarInscripcion = withRepoLogging(REPO, 'cancelarInscripcion', async (eventoId: string, familiarId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('familia_evento_inscripciones').delete().eq('evento_id', eventoId).eq('familiar_id', familiarId);
  if (error) falla('cancelar la inscripción', error);
});

export type EventoInput = {
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  iniciaEn: string;
  terminaEn: string | null;
  abiertoInscripcion: boolean;
  cupo: number | null;
};

export const listarEventosAdmin = withRepoLogging(REPO, 'listarEventosAdmin', async (organizacionId: string): Promise<EventoParaFamiliar[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_eventos').select(COLUMNAS_EVENTO).eq('organizacion_id', organizacionId).order('inicia_en', { ascending: false }).limit(300);
  if (error) falla('cargar los eventos', error);
  const eventos = (data ?? []) as Evento[];
  return conInscripciones(eventos, await inscripcionesPorEvento(eventos.map((e) => e.id)), null);
});

export const crearEvento = withRepoLogging(REPO, 'crearEvento', async (organizacionId: string, creadoPor: string, input: EventoInput): Promise<Evento> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_eventos')
    .insert({
      organizacion_id: organizacionId,
      titulo: input.titulo,
      descripcion: input.descripcion,
      lugar: input.lugar,
      inicia_en: input.iniciaEn,
      termina_en: input.terminaEn,
      abierto_inscripcion: input.abiertoInscripcion,
      cupo: input.cupo,
      creado_por: creadoPor,
    })
    .select(COLUMNAS_EVENTO)
    .single();
  if (error) falla('crear el evento', error);
  return data as Evento;
});

export const actualizarEvento = withRepoLogging(
  REPO,
  'actualizarEvento',
  async (id: string, organizacionId: string, cambios: Partial<EventoInput>): Promise<Evento | null> => {
    const fila: Record<string, unknown> = {};
    if (cambios.titulo !== undefined) fila.titulo = cambios.titulo;
    if (cambios.descripcion !== undefined) fila.descripcion = cambios.descripcion;
    if (cambios.lugar !== undefined) fila.lugar = cambios.lugar;
    if (cambios.iniciaEn !== undefined) fila.inicia_en = cambios.iniciaEn;
    if (cambios.terminaEn !== undefined) fila.termina_en = cambios.terminaEn;
    if (cambios.abiertoInscripcion !== undefined) fila.abierto_inscripcion = cambios.abiertoInscripcion;
    if (cambios.cupo !== undefined) fila.cupo = cambios.cupo;
    const { data, error } = await getSupabaseAdmin().from('familia_eventos').update(fila).eq('id', id).eq('organizacion_id', organizacionId).select(COLUMNAS_EVENTO).maybeSingle();
    if (error) falla('actualizar el evento', error);
    return (data as Evento | null) ?? null;
  },
);

export const eliminarEvento = withRepoLogging(REPO, 'eliminarEvento', async (id: string, organizacionId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('familia_eventos').delete().eq('id', id).eq('organizacion_id', organizacionId);
  if (error) falla('eliminar el evento', error);
});

export const listarInscripciones = withRepoLogging(REPO, 'listarInscripciones', async (eventoId: string): Promise<Inscripcion[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_evento_inscripciones')
    .select('familiar_id, personas, created_at, familiar:familiares(nombre, apellido, email)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });
  if (error) falla('cargar las inscripciones', error);
  const filas = (data ?? []) as unknown as Array<{ familiar_id: string; personas: number; created_at: string; familiar: { nombre: string; apellido: string; email: string } | null }>;
  return filas.map((f) => ({ familiar_id: f.familiar_id, personas: f.personas, created_at: f.created_at, nombre: f.familiar?.nombre ?? '', apellido: f.familiar?.apellido ?? '', email: f.familiar?.email ?? '' }));
});

// ─── Documentos generales ────────────────────────────────────────────────────

export interface Documento {
  id: string;
  organizacion_id: string;
  titulo: string;
  descripcion: string | null;
  archivo_path: string;
  nombre_archivo: string;
  mime: string;
  tamano_bytes: number;
  created_at: string;
}

const COLUMNAS_DOCUMENTO = 'id, organizacion_id, titulo, descripcion, archivo_path, nombre_archivo, mime, tamano_bytes, created_at';

export const listarDocumentos = withRepoLogging(REPO, 'listarDocumentos', async (organizacionId: string): Promise<Documento[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_documentos').select(COLUMNAS_DOCUMENTO).eq('organizacion_id', organizacionId).order('created_at', { ascending: false });
  if (error) falla('cargar los documentos', error);
  return (data ?? []) as Documento[];
});

export const crearDocumento = withRepoLogging(
  REPO,
  'crearDocumento',
  async (organizacionId: string, creadoPor: string, input: { titulo: string; descripcion: string | null; archivoPath: string; nombreArchivo: string; mime: string; tamanoBytes: number }): Promise<Documento> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_documentos')
      .insert({
        organizacion_id: organizacionId,
        titulo: input.titulo,
        descripcion: input.descripcion,
        archivo_path: input.archivoPath,
        nombre_archivo: input.nombreArchivo,
        mime: input.mime,
        tamano_bytes: input.tamanoBytes,
        creado_por: creadoPor,
      })
      .select(COLUMNAS_DOCUMENTO)
      .single();
    if (error) falla('guardar el documento', error);
    return data as Documento;
  },
);

/** Borra la fila y devuelve la ruta del archivo (para que el servicio lo saque del bucket), o null si no existía. */
export const eliminarDocumento = withRepoLogging(REPO, 'eliminarDocumento', async (id: string, organizacionId: string): Promise<string | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_documentos').delete().eq('id', id).eq('organizacion_id', organizacionId).select('archivo_path').maybeSingle();
  if (error) falla('eliminar el documento', error);
  return (data as { archivo_path: string } | null)?.archivo_path ?? null;
});

// ─── Noticias (novedades marcadas "para familias") ───────────────────────────

export interface Noticia {
  id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  categoria: string;
  fecha_evento: string | null;
  fijada: boolean;
  publicar_en: string;
}

export const listarNoticias = withRepoLogging(REPO, 'listarNoticias', async (organizacionId: string): Promise<Noticia[]> => {
  const ahora = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('novedades')
    .select('id, titulo, texto, imagen_url, categoria, fecha_evento, fijada, publicar_en')
    .eq('organizacion_id', organizacionId)
    .eq('para_familias', true)
    .eq('es_borrador', false)
    .gt('visible_hasta', ahora)
    .lte('publicar_en', ahora)
    .order('fijada', { ascending: false })
    .order('publicar_en', { ascending: false })
    .limit(50);
  if (error) falla('cargar las noticias', error);
  return (data ?? []) as Noticia[];
});

// ─── Fotos: álbumes, reacciones y comentarios ────────────────────────────────

export type TipoReaccion = 'corazon' | 'me_gusta' | 'abrazo';

export interface Album {
  id: string;
  organizacion_id: string;
  titulo: string;
  actividad: string | null;
  fecha: string;
  publicado_en: string | null;
  created_at: string;
}

export interface AlbumResumen extends Album {
  cantidad_fotos: number;
  portada_path: string | null;
}

export interface Foto {
  id: string;
  album_id: string;
  imagen_path: string;
  orden: number;
}

export interface FotoConInteracciones extends Foto {
  reacciones: Record<TipoReaccion, number>;
  mi_reaccion: TipoReaccion | null;
  cantidad_comentarios: number;
}

export interface Comentario {
  id: string;
  foto_id: string;
  familiar_id: string;
  texto: string;
  created_at: string;
  autor: string;
}

const COLUMNAS_ALBUM = 'id, organizacion_id, titulo, actividad, fecha, publicado_en, created_at';

async function resumirAlbumes(albumes: Album[]): Promise<AlbumResumen[]> {
  if (albumes.length === 0) return [];
  const { data, error } = await getSupabaseAdmin().from('familia_fotos').select('album_id, imagen_path, orden').in('album_id', albumes.map((a) => a.id)).order('orden', { ascending: true });
  if (error) falla('cargar las fotos', error);
  const fotos = (data ?? []) as Array<{ album_id: string; imagen_path: string; orden: number }>;
  return albumes.map((a) => {
    const propias = fotos.filter((f) => f.album_id === a.id);
    return { ...a, cantidad_fotos: propias.length, portada_path: propias[0]?.imagen_path ?? null };
  });
}

/** Solo los álbumes que el personal publicó de forma explícita. */
export const listarAlbumesPublicados = withRepoLogging(REPO, 'listarAlbumesPublicados', async (organizacionId: string): Promise<AlbumResumen[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_albumes')
    .select(COLUMNAS_ALBUM)
    .eq('organizacion_id', organizacionId)
    .not('publicado_en', 'is', null)
    .lte('publicado_en', new Date().toISOString())
    .order('publicado_en', { ascending: false })
    .limit(100);
  if (error) falla('cargar los álbumes', error);
  return (await resumirAlbumes((data ?? []) as Album[])).filter((a) => a.cantidad_fotos > 0);
});

export const obtenerAlbumPublicado = withRepoLogging(REPO, 'obtenerAlbumPublicado', async (id: string, organizacionId: string): Promise<Album | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_albumes')
    .select(COLUMNAS_ALBUM)
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .not('publicado_en', 'is', null)
    .lte('publicado_en', new Date().toISOString())
    .maybeSingle();
  if (error) falla('cargar el álbum', error);
  return (data as Album | null) ?? null;
});

export const listarFotosConInteracciones = withRepoLogging(REPO, 'listarFotosConInteracciones', async (albumId: string, familiarId: string): Promise<FotoConInteracciones[]> => {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('familia_fotos').select('id, album_id, imagen_path, orden').eq('album_id', albumId).order('orden', { ascending: true });
  if (error) falla('cargar las fotos', error);
  const fotos = (data ?? []) as Foto[];
  if (fotos.length === 0) return [];
  const ids = fotos.map((f) => f.id);

  const { data: reacciones, error: errorReacciones } = await db.from('familia_foto_reacciones').select('foto_id, familiar_id, tipo').in('foto_id', ids);
  if (errorReacciones) falla('cargar las reacciones', errorReacciones);
  const { data: comentarios, error: errorComentarios } = await db.from('familia_foto_comentarios').select('foto_id').in('foto_id', ids).is('eliminado_en', null);
  if (errorComentarios) falla('cargar los comentarios', errorComentarios);

  const filasReacciones = (reacciones ?? []) as Array<{ foto_id: string; familiar_id: string; tipo: TipoReaccion }>;
  const filasComentarios = (comentarios ?? []) as Array<{ foto_id: string }>;
  return fotos.map((f) => {
    const propias = filasReacciones.filter((r) => r.foto_id === f.id);
    const conteo: Record<TipoReaccion, number> = { corazon: 0, me_gusta: 0, abrazo: 0 };
    for (const r of propias) conteo[r.tipo] += 1;
    return {
      ...f,
      reacciones: conteo,
      mi_reaccion: propias.find((r) => r.familiar_id === familiarId)?.tipo ?? null,
      cantidad_comentarios: filasComentarios.filter((c) => c.foto_id === f.id).length,
    };
  });
});

/** La foto, solo si está en un álbum publicado de esa institución. */
export const obtenerFotoPublicada = withRepoLogging(REPO, 'obtenerFotoPublicada', async (fotoId: string, organizacionId: string): Promise<Foto | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_fotos')
    .select('id, album_id, imagen_path, orden, album:familia_albumes!inner(publicado_en, organizacion_id)')
    .eq('id', fotoId)
    .eq('organizacion_id', organizacionId)
    .not('album.publicado_en', 'is', null)
    .lte('album.publicado_en', new Date().toISOString())
    .maybeSingle();
  if (error) falla('cargar la foto', error);
  if (!data) return null;
  const { id, album_id, imagen_path, orden } = data as unknown as Foto;
  return { id, album_id, imagen_path, orden };
});

export const guardarReaccion = withRepoLogging(REPO, 'guardarReaccion', async (fotoId: string, familiarId: string, tipo: TipoReaccion | null): Promise<void> => {
  const db = getSupabaseAdmin();
  if (tipo === null) {
    const { error } = await db.from('familia_foto_reacciones').delete().eq('foto_id', fotoId).eq('familiar_id', familiarId);
    if (error) falla('quitar la reacción', error);
    return;
  }
  const { error } = await db.from('familia_foto_reacciones').upsert({ foto_id: fotoId, familiar_id: familiarId, tipo }, { onConflict: 'foto_id,familiar_id' });
  if (error) falla('guardar la reacción', error);
});

export const listarComentarios = withRepoLogging(REPO, 'listarComentarios', async (fotoId: string): Promise<Comentario[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_foto_comentarios')
    .select('id, foto_id, familiar_id, texto, created_at, familiar:familiares(nombre, apellido)')
    .eq('foto_id', fotoId)
    .is('eliminado_en', null)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) falla('cargar los comentarios', error);
  const filas = (data ?? []) as unknown as Array<Omit<Comentario, 'autor'> & { familiar: { nombre: string; apellido: string } | null }>;
  return filas.map(({ familiar, ...c }) => ({ ...c, autor: familiar ? `${familiar.nombre} ${familiar.apellido}`.trim() : 'Familiar' }));
});

export const crearComentario = withRepoLogging(
  REPO,
  'crearComentario',
  async (fotoId: string, organizacionId: string, familiarId: string, texto: string): Promise<string> => {
    const { data, error } = await getSupabaseAdmin().from('familia_foto_comentarios').insert({ foto_id: fotoId, organizacion_id: organizacionId, familiar_id: familiarId, texto }).select('id').single();
    if (error) falla('publicar el comentario', error);
    return (data as { id: string }).id;
  },
);

/** El familiar borra SU comentario. Devuelve false si no existe o no es suyo. */
export const eliminarComentarioPropio = withRepoLogging(REPO, 'eliminarComentarioPropio', async (id: string, familiarId: string): Promise<boolean> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_foto_comentarios')
    .update({ eliminado_en: new Date().toISOString(), eliminado_por: familiarId })
    .eq('id', id)
    .eq('familiar_id', familiarId)
    .is('eliminado_en', null)
    .select('id')
    .maybeSingle();
  if (error) falla('borrar el comentario', error);
  return data !== null;
});

/** Moderación del personal. `usuarioId` es el id de auth del admin. Devuelve false si no existe en esa institución. */
export const eliminarComentarioModeracion = withRepoLogging(REPO, 'eliminarComentarioModeracion', async (id: string, organizacionId: string, usuarioId: string): Promise<boolean> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_foto_comentarios')
    .update({ eliminado_en: new Date().toISOString(), eliminado_por: usuarioId })
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .is('eliminado_en', null)
    .select('id')
    .maybeSingle();
  if (error) falla('borrar el comentario', error);
  return data !== null;
});

export const listarComentariosDelAlbumAdmin = withRepoLogging(REPO, 'listarComentariosDelAlbumAdmin', async (albumId: string, organizacionId: string): Promise<Array<Comentario>> => {
  const db = getSupabaseAdmin();
  const { data: fotos, error } = await db.from('familia_fotos').select('id').eq('album_id', albumId).eq('organizacion_id', organizacionId);
  if (error) falla('cargar las fotos', error);
  const ids = ((fotos ?? []) as Array<{ id: string }>).map((f) => f.id);
  if (ids.length === 0) return [];
  const { data, error: errorComentarios } = await db
    .from('familia_foto_comentarios')
    .select('id, foto_id, familiar_id, texto, created_at, familiar:familiares(nombre, apellido)')
    .in('foto_id', ids)
    .is('eliminado_en', null)
    .order('created_at', { ascending: false })
    .limit(300);
  if (errorComentarios) falla('cargar los comentarios', errorComentarios);
  const filas = (data ?? []) as unknown as Array<Omit<Comentario, 'autor'> & { familiar: { nombre: string; apellido: string } | null }>;
  return filas.map(({ familiar, ...c }) => ({ ...c, autor: familiar ? `${familiar.nombre} ${familiar.apellido}`.trim() : 'Familiar' }));
});

// ─── Álbumes: administración ─────────────────────────────────────────────────

export const listarAlbumesAdmin = withRepoLogging(REPO, 'listarAlbumesAdmin', async (organizacionId: string): Promise<AlbumResumen[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_albumes').select(COLUMNAS_ALBUM).eq('organizacion_id', organizacionId).order('created_at', { ascending: false }).limit(200);
  if (error) falla('cargar los álbumes', error);
  return resumirAlbumes((data ?? []) as Album[]);
});

export const obtenerAlbum = withRepoLogging(REPO, 'obtenerAlbum', async (id: string, organizacionId: string): Promise<Album | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_albumes').select(COLUMNAS_ALBUM).eq('id', id).eq('organizacion_id', organizacionId).maybeSingle();
  if (error) falla('cargar el álbum', error);
  return (data as Album | null) ?? null;
});

export const listarFotosDeAlbum = withRepoLogging(REPO, 'listarFotosDeAlbum', async (albumId: string): Promise<Foto[]> => {
  const { data, error } = await getSupabaseAdmin().from('familia_fotos').select('id, album_id, imagen_path, orden').eq('album_id', albumId).order('orden', { ascending: true });
  if (error) falla('cargar las fotos', error);
  return (data ?? []) as Foto[];
});

export const crearAlbum = withRepoLogging(
  REPO,
  'crearAlbum',
  async (organizacionId: string, creadoPor: string, input: { titulo: string; actividad: string | null; fecha: string; publicadoEn: string | null }): Promise<Album> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_albumes')
      .insert({ organizacion_id: organizacionId, titulo: input.titulo, actividad: input.actividad, fecha: input.fecha, publicado_en: input.publicadoEn, creado_por: creadoPor })
      .select(COLUMNAS_ALBUM)
      .single();
    if (error) falla('crear el álbum', error);
    return data as Album;
  },
);

export const actualizarAlbum = withRepoLogging(
  REPO,
  'actualizarAlbum',
  async (id: string, organizacionId: string, cambios: { titulo?: string; actividad?: string | null; fecha?: string; publicadoEn?: string | null }): Promise<Album | null> => {
    const fila: Record<string, unknown> = {};
    if (cambios.titulo !== undefined) fila.titulo = cambios.titulo;
    if (cambios.actividad !== undefined) fila.actividad = cambios.actividad;
    if (cambios.fecha !== undefined) fila.fecha = cambios.fecha;
    if (cambios.publicadoEn !== undefined) fila.publicado_en = cambios.publicadoEn;
    const { data, error } = await getSupabaseAdmin().from('familia_albumes').update(fila).eq('id', id).eq('organizacion_id', organizacionId).select(COLUMNAS_ALBUM).maybeSingle();
    if (error) falla('actualizar el álbum', error);
    return (data as Album | null) ?? null;
  },
);

/** Borra el álbum y devuelve las rutas de sus fotos para sacarlas del bucket. */
export const eliminarAlbum = withRepoLogging(REPO, 'eliminarAlbum', async (id: string, organizacionId: string): Promise<string[] | null> => {
  const album = await obtenerAlbum(id, organizacionId);
  if (!album) return null;
  const fotos = await listarFotosDeAlbum(id);
  const { error } = await getSupabaseAdmin().from('familia_albumes').delete().eq('id', id).eq('organizacion_id', organizacionId);
  if (error) falla('eliminar el álbum', error);
  return fotos.map((f) => f.imagen_path);
});

export const agregarFoto = withRepoLogging(REPO, 'agregarFoto', async (albumId: string, organizacionId: string, imagenPath: string, orden: number): Promise<Foto> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_fotos')
    .insert({ album_id: albumId, organizacion_id: organizacionId, imagen_path: imagenPath, orden })
    .select('id, album_id, imagen_path, orden')
    .single();
  if (error) falla('guardar la foto', error);
  return data as Foto;
});

/** Borra la foto y devuelve su ruta (o null si no existía en esa institución). */
export const eliminarFoto = withRepoLogging(REPO, 'eliminarFoto', async (fotoId: string, organizacionId: string): Promise<string | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_fotos').delete().eq('id', fotoId).eq('organizacion_id', organizacionId).select('imagen_path').maybeSingle();
  if (error) falla('eliminar la foto', error);
  return (data as { imagen_path: string } | null)?.imagen_path ?? null;
});
