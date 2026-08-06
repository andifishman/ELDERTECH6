import { randomUUID } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { requireResidenteContext } from '../../utils/validators';
import * as repo from '../../repositories/agendaRepository';
import * as assistantService from '../assistant/AssistantService';
import * as activitiesService from '../activities/ActivitiesService';
import type {
  EstadoRecordatorio,
  ListarRecordatoriosOpciones,
  Recordatorio,
  RecordatorioInput,
  RecordatorioInputRow,
  RecurrenciaTipo,
} from '../../providers/agenda/AgendaTypes';

const HORIZONTE_MAX_OCURRENCIAS = 365;

/** Colores por defecto cuando el recordatorio no trae uno propio — coherente con el resto de la app. */
export const COLOR_POR_PRIORIDAD: Record<string, string> = {
  baja: '#66BB6A',
  media: '#42A5F5',
  alta: '#FFA726',
  urgente: '#E53935',
};

function normalizarHora(h?: string | null): string | null {
  if (!h) return null;
  return h.length === 5 ? `${h}:00` : h;
}

function aRow(residenteId: string, organizacionId: string, creadoPor: string, input: RecordatorioInput): RecordatorioInputRow {
  const tieneAudio = !!input.audio_url;
  return {
    residente_id: residenteId,
    organizacion_id: organizacionId,
    creado_por: creadoPor,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    fecha: input.fecha,
    hora: normalizarHora(input.hora),
    prioridad: input.prioridad,
    color: input.color ?? null,
    icono: input.icono ?? null,
    tipo_contenido: tieneAudio ? (input.descripcion?.trim() ? 'ambos' : 'audio') : 'texto',
    audio_url: input.audio_url ?? null,
    audio_transcripcion: input.audio_transcripcion ?? null,
    audio_duracion_segundos: input.audio_duracion_segundos ?? null,
    recordatorio_offset_minutos: input.recordatorio_offset_minutos ?? null,
    origen: input.origen ?? 'manual',
    actividad_origen_id: null,
    serie_id: null,
    es_plantilla: false,
    recurrencia_tipo: input.recurrencia_tipo ?? 'ninguna',
    recurrencia_dias_semana: input.recurrencia_dias_semana ?? null,
    recurrencia_hasta: input.recurrencia_hasta ?? null,
  };
}

/**
 * Próximas fechas ('YYYY-MM-DD') de una serie recurrente, sin incluir la fecha
 * de inicio (esa ya es la plantilla). Tope de seguridad de 365 ocurrencias —
 * mismo criterio que `ActivitiesAdminService.generarOcurrencias`.
 *
 * Nota sobre mensual/anual: se usa aritmética nativa de `Date` — si el día de
 * inicio no existe en un mes destino (ej. 31 de enero → febrero) `Date` lo
 * corre al mes siguiente en vez de recortarlo al último día. Comportamiento
 * conocido y aceptado para esta primera versión.
 */
function generarFechasOcurrencias(
  fechaInicio: string,
  tipo: RecurrenciaTipo,
  diasSemana: number[] | null | undefined,
  hasta: string | null | undefined,
): string[] {
  if (tipo === 'ninguna') return [];

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = hasta
    ? new Date(`${hasta}T00:00:00`)
    : new Date(inicio.getFullYear() + 1, inicio.getMonth(), inicio.getDate());

  const diasObjetivo = tipo === 'laborables' ? [1, 2, 3, 4, 5] : tipo === 'personalizada' ? (diasSemana ?? []) : null;
  if ((tipo === 'personalizada') && !diasObjetivo?.length) return [];

  const fechas: string[] = [];
  const cursor = new Date(inicio);

  if (tipo === 'diaria' || tipo === 'laborables' || tipo === 'personalizada') {
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= fin && fechas.length < HORIZONTE_MAX_OCURRENCIAS) {
      if (!diasObjetivo || diasObjetivo.includes(cursor.getDay())) {
        fechas.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (tipo === 'semanal') {
    cursor.setDate(cursor.getDate() + 7);
    while (cursor <= fin && fechas.length < HORIZONTE_MAX_OCURRENCIAS) {
      fechas.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (tipo === 'mensual') {
    cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= fin && fechas.length < HORIZONTE_MAX_OCURRENCIAS) {
      fechas.push(cursor.toISOString().slice(0, 10));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (tipo === 'anual') {
    cursor.setFullYear(cursor.getFullYear() + 1);
    while (cursor <= fin && fechas.length < HORIZONTE_MAX_OCURRENCIAS) {
      fechas.push(cursor.toISOString().slice(0, 10));
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
  }

  return fechas;
}

export async function crear(user: AuthUser, input: RecordatorioInput): Promise<Recordatorio> {
  const { residenteId, organizacionId } = requireResidenteContext(user);

  const row = aRow(residenteId, organizacionId, residenteId, input);
  const esRecurrente = (input.recurrencia_tipo ?? 'ninguna') !== 'ninguna';
  if (esRecurrente) {
    row.es_plantilla = true;
    row.serie_id = randomUUID();
  }

  const plantilla = await repo.crear(row);

  if (esRecurrente) {
    const fechas = generarFechasOcurrencias(input.fecha, input.recurrencia_tipo!, input.recurrencia_dias_semana, input.recurrencia_hasta);
    if (fechas.length > 0) {
      const filas = fechas.map((fecha) => ({ ...row, fecha, es_plantilla: false }));
      await repo.insertOcurrenciasBatch(filas);
    }
  }

  return plantilla;
}

export async function editar(user: AuthUser, id: string, input: Partial<RecordatorioInput>): Promise<Recordatorio> {
  const { residenteId } = requireResidenteContext(user);
  const actual = await repo.obtenerPorId(id, residenteId);
  if (!actual) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');

  const patch: Partial<RecordatorioInputRow> = {};
  if (input.titulo !== undefined) patch.titulo = input.titulo;
  if (input.descripcion !== undefined) patch.descripcion = input.descripcion ?? null;
  if (input.fecha !== undefined) patch.fecha = input.fecha;
  if (input.hora !== undefined) patch.hora = normalizarHora(input.hora);
  if (input.prioridad !== undefined) patch.prioridad = input.prioridad;
  if (input.color !== undefined) patch.color = input.color ?? null;
  if (input.icono !== undefined) patch.icono = input.icono ?? null;
  if (input.recordatorio_offset_minutos !== undefined) patch.recordatorio_offset_minutos = input.recordatorio_offset_minutos ?? null;
  if (input.audio_url !== undefined) {
    patch.audio_url = input.audio_url ?? null;
    patch.audio_transcripcion = input.audio_transcripcion ?? null;
    patch.audio_duracion_segundos = input.audio_duracion_segundos ?? null;
    patch.tipo_contenido = input.audio_url ? (patch.descripcion ?? actual.descripcion)?.trim() ? 'ambos' : 'audio' : 'texto';
  }
  // Si se edita fecha/hora, el recordatorio vuelve a quedar "pendiente" (por si
  // estaba vencido) y habilitado para notificar de nuevo en el nuevo horario.
  if (input.fecha !== undefined || input.hora !== undefined) {
    if (actual.estado === 'vencido') patch.estado = 'pendiente';
    patch.notificacion_enviada = false;
  }

  const actualizado = await repo.actualizar(id, residenteId, patch);
  if (!actualizado) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');
  return actualizado;
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  const { residenteId } = requireResidenteContext(user);
  await repo.eliminar(id, residenteId);
}

export async function obtenerPorId(user: AuthUser, id: string): Promise<Recordatorio> {
  const { residenteId } = requireResidenteContext(user);
  const recordatorio = await repo.obtenerPorId(id, residenteId);
  if (!recordatorio) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');
  return recordatorio;
}

export async function listar(user: AuthUser, opciones: ListarRecordatoriosOpciones): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  return repo.listar(residenteId, opciones);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listarHoy(user: AuthUser): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const hoy = hoyISO();
  return repo.listarPorRangoFecha(residenteId, hoy, hoy);
}

export async function listarSemana(user: AuthUser, fechaRef?: string): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const ref = fechaRef ? new Date(`${fechaRef}T00:00:00`) : new Date();
  const diaSemana = ref.getDay(); // 0=domingo
  const lunes = new Date(ref);
  lunes.setDate(ref.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return repo.listarPorRangoFecha(residenteId, lunes.toISOString().slice(0, 10), domingo.toISOString().slice(0, 10));
}

export async function listarMes(user: AuthUser, fechaRef?: string): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const ref = fechaRef ? new Date(`${fechaRef}T00:00:00`) : new Date();
  const primerDia = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return repo.listarPorRangoFecha(residenteId, primerDia.toISOString().slice(0, 10), ultimoDia.toISOString().slice(0, 10));
}

export async function listarProximos(user: AuthUser, limit = 10): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  return repo.listarProximos(residenteId, hoyISO(), limit);
}

export async function cambiarEstado(user: AuthUser, id: string, estado: EstadoRecordatorio): Promise<Recordatorio> {
  const { residenteId } = requireResidenteContext(user);
  const actualizado = await repo.actualizarEstado(id, residenteId, estado);
  if (!actualizado) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');
  return actualizado;
}

/** Sube el audio + lo transcribe (reusa el pipeline de Whisper del Asistente) — no crea el recordatorio todavía. */
export async function subirYTranscribirAudio(
  user: AuthUser,
  audio: { buffer: Buffer; mimeType: string; originalName: string; duracionSegundos: number | null },
): Promise<{ audio_url: string; audio_transcripcion: string | null; audio_duracion_segundos: number | null }> {
  const { residenteId } = requireResidenteContext(user);

  const audioUrl = await repo.subirAudio(residenteId, audio.buffer, audio.mimeType, audio.originalName);

  let transcripcion: string | null = null;
  try {
    transcripcion = await assistantService.transcribir(audio.buffer, audio.originalName, audio.mimeType);
  } catch {
    // Best-effort: si Whisper falla, el audio queda igual guardado y reproducible, solo sin texto.
    transcripcion = null;
  }

  return { audio_url: audioUrl, audio_transcripcion: transcripcion, audio_duracion_segundos: audio.duracionSegundos };
}

/** Crea un recordatorio a partir de una actividad de Horarios — "importar con un toque". */
export async function importarDeHorario(user: AuthUser, actividadId: string): Promise<Recordatorio> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  const actividad = await activitiesService.getActividadById(actividadId);
  // `getActividadById` no filtra por organización (lo mismo que ya hace el
  // endpoint de Horarios) — lo verificamos acá para no dejar importar una
  // actividad de otro geriátrico a la agenda personal.
  if (actividad.organizacion_id !== organizacionId) {
    throw new HttpError(StatusCodes.NOT_FOUND, 'No se encontró la actividad.');
  }

  const lugar = actividad.ubicacion?.nombre ? ` en ${actividad.ubicacion.nombre}` : '';
  const row = aRow(residenteId, organizacionId, residenteId, {
    titulo: actividad.nombre,
    descripcion: actividad.descripcion ? `${actividad.descripcion}${lugar}` : (lugar ? `Actividad del geriátrico${lugar}.` : null),
    fecha: actividad.fecha,
    hora: actividad.hora_inicio,
    prioridad: 'media',
    icono: actividad.emoji_icono ?? actividad.tipo_actividad?.emoji ?? '📅',
    color: actividad.tipo_actividad?.color ?? null,
    origen: 'horarios',
    recurrencia_tipo: 'ninguna',
  });
  row.actividad_origen_id = actividadId;

  return repo.crear(row);
}
