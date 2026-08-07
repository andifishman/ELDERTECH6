import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { requireResidenteContext } from '../../utils/validators';
import * as repo from '../../repositories/agendaRepository';
import type {
  EstadoRecordatorio,
  ListarRecordatoriosOpciones,
  Recordatorio,
  RecordatorioInput,
  RecordatorioInputRow,
} from '../../providers/agenda/AgendaTypes';

function aRow(residenteId: string, organizacionId: string, creadoPor: string, input: RecordatorioInput): RecordatorioInputRow {
  return {
    residente_id: residenteId,
    organizacion_id: organizacionId,
    creado_por: creadoPor,
    titulo: input.titulo,
    fecha: input.fecha,
    hora: input.hora.length === 5 ? `${input.hora}:00` : input.hora,
  };
}

export async function crear(user: AuthUser, input: RecordatorioInput): Promise<Recordatorio> {
  const { residenteId, organizacionId } = requireResidenteContext(user);
  return repo.crear(aRow(residenteId, organizacionId, residenteId, input));
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
