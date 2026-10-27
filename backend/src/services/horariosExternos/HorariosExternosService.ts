import { getCacheStore } from '../../cache';
import { env } from '../../config/env';
import { HttpError } from '../../middlewares/errorHandler';
import { logger } from '../../logging/logger';
import { StatusCodes } from 'http-status-codes';

/**
 * Horarios del Hogar LeDor VaDor: la grilla vive en SU sistema (feed JSON de solo lectura).
 * Nosotros la traemos acá, la guardamos en caché y la app lee de nuestra API — así el
 * celular nunca le pega al sistema externo y este recibe como mucho 1 pedido cada 5 min.
 * Contrato del feed: feed-actividades-documentacion.md (campos pueden crecer: se ignoran los desconocidos).
 */

export interface ActividadExterna {
  id: number;
  nombre: string;
  dia: string;
  hora: string | null;
  horario: string;
  lugar: string | null;
  sectores: string[];
  tallerista: string | null;
  estado: string;
  suspendido: boolean;
}

export interface SnapshotHorariosExternos {
  /** Cuándo generó la grilla el sistema externo (`generado_en` del feed). */
  generadoEn: string | null;
  /** Cuándo la trajimos nosotros por última vez. */
  actualizadoEn: string;
  actividades: ActividadExterna[];
}

const CACHE_KEY = 'horarios-externos:snapshot';
/** Pasados estos segundos el snapshot se considera viejo y se vuelve a pedir al feed. */
const FRESCO_SEGUNDOS = 5 * 60;
/** El snapshot se conserva mucho más que eso: si el feed se cae seguimos mostrando lo último que tuvimos. */
const RETENCION_SEGUNDOS = 24 * 60 * 60;
const TIMEOUT_MS = 10_000;

/** Evita que varias requests simultáneas disparen varios pedidos al feed a la vez (dentro de la misma instancia). */
let refrescoEnCurso: Promise<SnapshotHorariosExternos> | null = null;

/** "Miércoles" → "miercoles": el feed ignora mayúsculas y tildes, nosotros también. */
export function normalizarDia(dia: string): string {
  return dia.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/** Tolerante a campos nuevos/faltantes, como pide la documentación del feed. */
function normalizarActividad(raw: unknown): ActividadExterna | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const nombre = texto(r.nombre);
  const dia = texto(r.dia);
  if (typeof r.id !== 'number' || !nombre || !dia) return null;
  const suspendido = r.suspendido === true || normalizarDia(String(r.estado ?? '')) === 'suspendido';
  return {
    id: r.id,
    nombre,
    dia,
    hora: texto(r.hora),
    horario: texto(r.horario) ?? 'Horario a coordinar',
    lugar: texto(r.lugar),
    sectores: Array.isArray(r.sectores) ? r.sectores.filter((s): s is string => typeof s === 'string') : [],
    tallerista: texto(r.tallerista),
    estado: texto(r.estado) ?? (suspendido ? 'Suspendido' : 'Activo'),
    suspendido,
  };
}

async function traerDelFeed(): Promise<SnapshotHorariosExternos> {
  if (!env.ledorFeedKey) {
    throw new HttpError(StatusCodes.SERVICE_UNAVAILABLE, 'Falta configurar LEDOR_FEED_KEY en el servidor.');
  }
  const url = new URL(env.ledorFeedUrl);
  url.searchParams.set('key', env.ledorFeedKey);
  url.searchParams.set('recurso', 'actividades');

  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`El feed respondió ${res.status}`);

  const body = (await res.json()) as { generado_en?: unknown; actividades?: unknown };
  if (!Array.isArray(body.actividades)) throw new Error('El feed no devolvió la lista "actividades"');

  return {
    generadoEn: texto(body.generado_en),
    actualizadoEn: new Date().toISOString(),
    actividades: body.actividades.map(normalizarActividad).filter((a): a is ActividadExterna => a !== null),
  };
}

async function refrescar(previo: SnapshotHorariosExternos | null): Promise<SnapshotHorariosExternos> {
  if (!refrescoEnCurso) {
    refrescoEnCurso = traerDelFeed()
      .then(async (snapshot) => {
        await getCacheStore().set(CACHE_KEY, snapshot, RETENCION_SEGUNDOS);
        return snapshot;
      })
      .finally(() => {
        refrescoEnCurso = null;
      });
  }
  try {
    return await refrescoEnCurso;
  } catch (err) {
    logger.error('[horarios-externos] no se pudo leer el feed', { error: err instanceof Error ? err.message : String(err), causa: err instanceof Error && err.cause ? String(err.cause) : undefined });
    // Si el feed se cae, la app sigue mostrando la última grilla buena en vez de quedarse vacía.
    if (previo) return previo;
    throw err instanceof HttpError ? err : new HttpError(StatusCodes.BAD_GATEWAY, `No se pudo consultar el sistema de horarios del hogar (${err instanceof Error ? err.message : 'error desconocido'}).`);
  }
}

function esFresco(snapshot: SnapshotHorariosExternos): boolean {
  return Date.now() - new Date(snapshot.actualizadoEn).getTime() < FRESCO_SEGUNDOS * 1000;
}

/** Grilla completa. `forzar` ignora la caché (botón "Actualizar ahora" del backoffice). */
export async function obtenerSnapshot(forzar = false): Promise<SnapshotHorariosExternos> {
  const guardado = await getCacheStore().get<SnapshotHorariosExternos>(CACHE_KEY);
  if (guardado && !forzar && esFresco(guardado)) return guardado;
  return refrescar(guardado);
}

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function diaDeHoyArgentina(): string {
  return normalizarDia(new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()));
}

/** Actividades de un día de la semana ("hoy" = el día actual en Argentina). Sin `dia`, la semana completa. */
export async function obtenerActividades(dia?: string): Promise<SnapshotHorariosExternos> {
  const snapshot = await obtenerSnapshot();
  if (!dia) return snapshot;
  const buscado = normalizarDia(dia) === 'hoy' ? diaDeHoyArgentina() : normalizarDia(dia);
  return { ...snapshot, actividades: snapshot.actividades.filter((a) => normalizarDia(a.dia) === buscado) };
}

export interface ActividadParaAsistente {
  id: string;
  nombre: string;
  dia: string;
  hora_inicio: string;
  lugar: string;
  tallerista: string;
  sectores: string[];
  suspendida: boolean;
}

function aMinutos(hora: string): number | null {
  const [h, m] = hora.split(':').map(Number);
  return h !== undefined && m !== undefined && Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * Búsqueda para la herramienta `buscar_actividades` del asistente: mismas actividades
 * que ve el residente en la pantalla Actividades. `fecha` es YYYY-MM-DD (sin fecha = hoy);
 * como la grilla es semanal, de la fecha solo importa el día de la semana.
 */
export async function buscarParaAsistente(params: { fecha?: string; busqueda?: string; hora?: string }): Promise<ActividadParaAsistente[]> {
  const coincideFecha = params.fecha ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.fecha) : null;
  const dia = coincideFecha
    ? NOMBRES_DIAS[new Date(Date.UTC(Number(coincideFecha[1]), Number(coincideFecha[2]) - 1, Number(coincideFecha[3]))).getUTCDay()]
    : diaDeHoyArgentina();
  const { actividades } = await obtenerActividades(dia);

  const texto = normalizarDia(params.busqueda ?? '');
  const pedida = params.hora ? aMinutos(params.hora) : null;

  return actividades
    .filter((a) => !texto || [a.nombre, a.tallerista ?? '', a.lugar ?? ''].some((c) => normalizarDia(c).includes(texto)))
    .filter((a) => {
      if (pedida === null) return true;
      const inicio = a.hora ? aMinutos(a.hora) : null;
      return inicio !== null && Math.abs(inicio - pedida) <= 60;
    })
    .map((a) => ({
      id: String(a.id),
      nombre: a.nombre,
      dia: a.dia,
      hora_inicio: a.hora ?? 'a coordinar',
      lugar: a.lugar ?? '',
      tallerista: a.tallerista ?? '',
      sectores: a.sectores,
      suspendida: a.suspendido,
    }));
}
