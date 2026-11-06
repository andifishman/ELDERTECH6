import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as accesoRepo from '../../repositories/familiaAccesoRepository';
import * as familiaRepo from '../../repositories/familiaRepository';
import * as auditService from '../audit/AuditService';
import { crearFamiliar, type CrearFamiliarInput } from './FamiliaService';

/** Tope de pedidos pendientes por institución: el endpoint es público y esto frena que alguien llene la bandeja. */
export const MAX_PENDIENTES = 300;

export type EstadoAcceso = 'registrado' | 'no_registrado' | 'deshabilitado';

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pantalla de entrada de la app de familiares: ¿este email está dado de alta? Es público (no hay sesión
 * todavía), así que solo contesta una de tres cosas y nada más sobre la persona o la residencia.
 */
export async function verificarEmail(email: string): Promise<{ estado: EstadoAcceso; instituciones: accesoRepo.Institucion[] }> {
  const familiar = await familiaRepo.obtenerFamiliarPorEmail(normalizarEmail(email));
  if (familiar) return { estado: familiar.activo ? 'registrado' : 'deshabilitado', instituciones: [] };
  return { estado: 'no_registrado', instituciones: await accesoRepo.listarInstitucionesActivas() };
}

export interface SolicitarAccesoInput {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  residenteTexto: string;
  parentesco: string | null;
  organizacionId?: string;
}

/** Deja el pedido en la bandeja del backoffice. Reintentar con el mismo email no duplica: actualiza el pedido pendiente. */
export async function solicitarAcceso(input: SolicitarAccesoInput): Promise<{ nueva: boolean }> {
  const email = normalizarEmail(input.email);

  const existente = await familiaRepo.obtenerFamiliarPorEmail(email);
  if (existente) {
    throw new HttpError(
      StatusCodes.CONFLICT,
      existente.activo ? 'Este email ya está dado de alta: pedí el código para entrar.' : 'El acceso de este email está deshabilitado. Comunicate con la residencia.',
    );
  }

  const instituciones = await accesoRepo.listarInstitucionesActivas();
  let organizacionId: string | undefined;
  if (input.organizacionId) {
    organizacionId = instituciones.find((i) => i.id === input.organizacionId)?.id;
    if (!organizacionId) throw new HttpError(StatusCodes.BAD_REQUEST, 'La residencia elegida no existe.');
  } else if (instituciones.length === 1) {
    organizacionId = instituciones[0]!.id;
  } else {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Elegí a qué residencia querés pedir acceso.');
  }

  if ((await accesoRepo.contarPendientes(organizacionId)) >= MAX_PENDIENTES) {
    throw new HttpError(StatusCodes.TOO_MANY_REQUESTS, 'Hay demasiadas solicitudes pendientes. Comunicate con la residencia por teléfono.');
  }

  const { nueva } = await accesoRepo.registrarSolicitud({
    organizacionId,
    email,
    nombre: input.nombre,
    apellido: input.apellido,
    telefono: input.telefono,
    residenteTexto: input.residenteTexto,
    parentesco: input.parentesco,
  });
  return { nueva };
}

// ─── Backoffice ──────────────────────────────────────────────────────────────

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function listarSolicitudes(user: AuthUser): Promise<accesoRepo.SolicitudAcceso[]> {
  return accesoRepo.listarSolicitudes(requireOrganizacionId(user));
}

async function solicitudPendienteDeLaInstitucion(user: AuthUser, id: string): Promise<accesoRepo.SolicitudAcceso> {
  const solicitud = await accesoRepo.obtenerSolicitud(id);
  if (!solicitud || solicitud.organizacion_id !== requireOrganizacionId(user)) throw new HttpError(StatusCodes.NOT_FOUND, 'Solicitud no encontrada.');
  if (solicitud.estado !== 'pendiente') throw new HttpError(StatusCodes.CONFLICT, 'Esta solicitud ya fue resuelta.');
  return solicitud;
}

/**
 * Aprobar = dar de alta al familiar (con los residentes que elija el personal) y mandarle la invitación. El email
 * sale SIEMPRE de la solicitud, nunca del cliente: se aprueba a quien pidió acceso, no a otra persona.
 */
export async function aprobarSolicitud(user: AuthUser, id: string, datos: Omit<CrearFamiliarInput, 'email'>): Promise<{ familiarId: string }> {
  const solicitud = await solicitudPendienteDeLaInstitucion(user, id);
  const { familiar } = await crearFamiliar(user, { ...datos, email: solicitud.email });
  await accesoRepo.resolverSolicitud(id, 'aprobada', user.supabaseUserId, familiar.id);
  await auditService.registrarAuditoria(user, {
    accion: 'resolver',
    tabla: 'familia_solicitudes_acceso',
    registroId: id,
    descripcion: `Aprobó el acceso de ${solicitud.email} a la app de familiares`,
  });
  return { familiarId: familiar.id };
}

export async function rechazarSolicitud(user: AuthUser, id: string): Promise<void> {
  const solicitud = await solicitudPendienteDeLaInstitucion(user, id);
  if (!(await accesoRepo.resolverSolicitud(id, 'rechazada', user.supabaseUserId, null))) throw new HttpError(StatusCodes.CONFLICT, 'Esta solicitud ya fue resuelta.');
  await auditService.registrarAuditoria(user, {
    accion: 'resolver',
    tabla: 'familia_solicitudes_acceso',
    registroId: id,
    descripcion: `Rechazó el pedido de acceso de ${solicitud.email} a la app de familiares`,
  });
}
