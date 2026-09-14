import { randomUUID } from 'node:crypto';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { requireResidenteContext } from '../../utils/validators';
import { hoyArgentinaISO } from '../../utils/argentinaTime';
import * as repo from '../../repositories/agendaRepository';
import type {
  EstadoRecordatorio,
  ListarRecordatoriosOpciones,
  Recordatorio,
  RecordatorioInput,
  RecordatorioInputRow,
} from '../../providers/agenda/AgendaTypes';

function aRow(
  residenteId: string,
  organizacionId: string,
  creadoPor: string,
  input: RecordatorioInput,
  grupoId?: string,
): RecordatorioInputRow {
  return {
    residente_id: residenteId,
    organizacion_id: organizacionId,
    creado_por: creadoPor,
    titulo: input.titulo,
    fecha: input.fecha,
    hora: input.hora.length === 5 ? `${input.hora}:00` : input.hora,
    grupo_id: grupoId ?? null,
  };
}

/** Fecha + `dias` días, en formato YYYY-MM-DD — ancla a mediodía UTC para no pisar el día por husos horarios. */
function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Cuántos días hay desde `fechaISO` (inclusive) hasta el último día de ESE mes (inclusive). */
function diasHastaFinDeMes(fechaISO: string): number {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const ultimoDiaDelMes = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return ultimoDiaDelMes - d.getUTCDate() + 1;
}

export async function crear(user: AuthUser, input: RecordatorioInput): Promise<Recordatorio> {
  const { residenteId, organizacionId } = requireResidenteContext(user);

  if (!input.repetirDiario) {
    return repo.crear(aRow(residenteId, organizacionId, residenteId, input));
  }

  // "Todo el mes" = una fila por día desde la fecha elegida hasta el último
  // día de ese mes, no una recurrencia real (no hay columna de recurrencia ni
  // cron que la expanda). Todas comparten grupoId para poder borrarlas
  // juntas después. Se devuelve la primera fila creada para no cambiar el
  // contrato de la pantalla de Agenda, que solo crea recordatorios sueltos.
  const grupoId = randomUUID();
  const dias = diasHastaFinDeMes(input.fecha);
  const filas: RecordatorioInputRow[] = Array.from({ length: dias }, (_, i) =>
    aRow(residenteId, organizacionId, residenteId, { ...input, fecha: sumarDias(input.fecha, i) }, grupoId),
  );
  const creados = await repo.crearVarios(filas);
  return creados[0] ?? (await repo.crear(aRow(residenteId, organizacionId, residenteId, input)));
}

export async function editar(user: AuthUser, id: string, input: Partial<RecordatorioInput>): Promise<Recordatorio> {
  const { residenteId } = requireResidenteContext(user);
  const actual = await repo.obtenerPorId(id, residenteId);
  if (!actual) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');

  const patch: Partial<RecordatorioInputRow> = {};
  if (input.titulo !== undefined) patch.titulo = input.titulo;
  if (input.fecha !== undefined) patch.fecha = input.fecha;
  if (input.hora !== undefined) patch.hora = input.hora.length === 5 ? `${input.hora}:00` : input.hora;
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

export async function eliminar(user: AuthUser, id: string, eliminarTodas = false): Promise<void> {
  const { residenteId } = requireResidenteContext(user);
  if (eliminarTodas) {
    const actual = await repo.obtenerPorId(id, residenteId);
    if (actual?.grupo_id) {
      await repo.eliminarPorGrupo(actual.grupo_id, residenteId);
      return;
    }
  }
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

export async function listarHoy(user: AuthUser): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const hoy = hoyArgentinaISO();
  return repo.listarPorRangoFecha(residenteId, hoy, hoy);
}

export async function listarSemana(user: AuthUser, fechaRef?: string): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const ref = new Date(`${fechaRef ?? hoyArgentinaISO()}T00:00:00`);
  const diaSemana = ref.getDay(); // 0=domingo
  const lunes = new Date(ref);
  lunes.setDate(ref.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return repo.listarPorRangoFecha(residenteId, lunes.toISOString().slice(0, 10), domingo.toISOString().slice(0, 10));
}

export async function listarMes(user: AuthUser, fechaRef?: string): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  const ref = new Date(`${fechaRef ?? hoyArgentinaISO()}T00:00:00`);
  const primerDia = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return repo.listarPorRangoFecha(residenteId, primerDia.toISOString().slice(0, 10), ultimoDia.toISOString().slice(0, 10));
}

export async function listarProximos(user: AuthUser, limit = 10): Promise<Recordatorio[]> {
  const { residenteId } = requireResidenteContext(user);
  return repo.listarProximos(residenteId, hoyArgentinaISO(), limit);
}

export async function cambiarEstado(user: AuthUser, id: string, estado: EstadoRecordatorio): Promise<Recordatorio> {
  const { residenteId } = requireResidenteContext(user);
  const actualizado = await repo.actualizarEstado(id, residenteId, estado);
  if (!actualizado) throw new HttpError(StatusCodes.NOT_FOUND, 'Recordatorio no encontrado.');
  return actualizado;
}
