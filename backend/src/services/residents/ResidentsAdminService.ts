import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import * as repo from '../../repositories/residentsRepository';
import * as auditService from '../audit/AuditService';
import * as gamesService from '../games/GamesService';
import type { ConteoPorJuego } from '../games/GamesService';
import { StatusCodes } from 'http-status-codes';

/** Porteo de `backoffice/src/services/residentesService.ts` — operaciones admin-only (backoffice). */

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

export async function listar(user: AuthUser): Promise<repo.ResidenteConCuenta[]> {
  return repo.listarResidentesAdmin(requireOrganizacionId(user));
}

export interface CrearUsuarioInput {
  nombre: string;
  apellido: string;
  seccion?: string | null;
  notas?: string | null;
  nombre_completo?: string | null;
  tipo_celular?: 'android' | 'iphone' | 'no_especificado';
  rol_empleado?: string | null;
  intereses?: string[];
  username: string;
  dni: string;
}

const SECCION_EMPLEADO = 'EMPLEADO LEDOR VADOR';

/** El rol/puesto solo aplica a empleados; para cualquier otra sección se guarda null. */
function normalizarRolEmpleado(seccion: string | null | undefined, rol: string | null | undefined): string | null {
  return seccion === SECCION_EMPLEADO && rol ? rol : null;
}

export async function crearUsuario(user: AuthUser, callerToken: string, input: CrearUsuarioInput): Promise<{ id: string; username: string }> {
  const { intereses, rol_empleado, ...datosCuenta } = input;
  const data = await repo.invocarAdminUsuarios(callerToken, { accion: 'crear', ...datosCuenta });
  if (!data.id || !data.username) throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, 'La función de administración de usuarios no devolvió los datos esperados.');

  // La Edge Function solo crea la cuenta + el residente. El puesto y los
  // intereses se completan acá: si fallan, el usuario ya quedó creado y se
  // pueden cargar después desde "Editar", así que no se revierte el alta.
  const rol = normalizarRolEmpleado(input.seccion, rol_empleado);
  try {
    if (rol) {
      await repo.actualizarResidenteAdmin(data.id, { nombre: input.nombre, apellido: input.apellido, rol_empleado: rol });
    }
    if (intereses && intereses.length > 0) await repo.reemplazarIntereses(data.id, intereses);
  } catch (err) {
    throw new HttpError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `El usuario se creó, pero no se pudieron guardar el rol o los intereses (${err instanceof Error ? err.message : String(err)}). Cargalos desde "Editar".`,
    );
  }

  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'residentes',
    registroId: data.id,
    descripcion: `Creó al usuario ${input.nombre} ${input.apellido} (usuario: ${data.username})`,
  });
  return { id: data.id, username: data.username };
}

export async function actualizar(user: AuthUser, id: string, input: repo.ResidenteAdminInput): Promise<void> {
  const datos = input.seccion !== undefined || input.rol_empleado !== undefined
    ? { ...input, rol_empleado: normalizarRolEmpleado(input.seccion, input.rol_empleado) }
    : input;
  await repo.actualizarResidenteAdmin(id, datos);
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `Editó al residente ${input.nombre} ${input.apellido}`,
  });
}

export async function resetearPassword(user: AuthUser, callerToken: string, residenteId: string, dni: string): Promise<void> {
  await repo.invocarAdminUsuarios(callerToken, { accion: 'resetear_password', residente_id: residenteId, dni });
  await auditService.registrarAuditoria(user, {
    accion: 'editar',
    tabla: 'residentes',
    registroId: residenteId,
    descripcion: 'Reseteó la contraseña (DNI) del usuario',
  });
}

export interface ResidenteDetalle extends repo.ResidenteDetalleRaw {
  residente: repo.Residente;
  partidasPorJuego: ConteoPorJuego[];
}

export async function obtenerDetalle(id: string): Promise<ResidenteDetalle> {
  const residente = await repo.obtenerResidenteAdmin(id);
  if (!residente) throw new HttpError(StatusCodes.NOT_FOUND, 'Residente no encontrado.');
  const [raw, partidasPorJuego] = await Promise.all([repo.obtenerResidenteDetalleRaw(id), gamesService.contarPartidasPorJuego(id)]);
  return { residente, ...raw, partidasPorJuego };
}

export async function eliminar(user: AuthUser, id: string): Promise<void> {
  const eliminado = await repo.eliminarResidenteAdmin(id, requireOrganizacionId(user));
  if (!eliminado) throw new HttpError(StatusCodes.NOT_FOUND, 'Usuario no encontrado.');
  await auditService.registrarAuditoria(user, {
    accion: 'eliminar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `Eliminó al usuario ${eliminado.nombre}`,
  });
}

export async function setActivo(user: AuthUser, id: string, activo: boolean, nombre?: string): Promise<void> {
  await repo.setActivoResidenteAdmin(id, activo);
  await auditService.registrarAuditoria(user, {
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `${activo ? 'Reactivó' : 'Desactivó'} a ${nombre ?? 'un residente'}`,
  });
}
