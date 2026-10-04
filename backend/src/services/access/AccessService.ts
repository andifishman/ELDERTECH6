import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { SUPER_ADMIN_IDS } from '../../config/superAdmins';
import * as repo from '../../repositories/accessRepository';
import * as auditService from '../audit/AuditService';

export interface PermisosPropios {
  isSuperAdmin: boolean;
  rol: AuthUser['rol'];
  permisos: repo.PermisoModulo[];
}

export interface UsuarioConAccesos {
  id: string;
  username: string;
  rol: repo.PerfilBackoffice['rol'];
  activo: boolean;
  esSuperAdmin: boolean;
  permisos: repo.PermisoModulo[];
}

const TODOS_LOS_PERMISOS = (modulos: repo.Modulo[]): repo.PermisoModulo[] =>
  modulos.map((m) => ({ moduloId: m.id, ver: true, crear: true, editar: true, eliminar: true }));

/** Lo que el backoffice necesita saber del usuario logueado para armar el menú y las pantallas. */
export async function obtenerMisPermisos(user: AuthUser): Promise<PermisosPropios> {
  const modulos = await repo.listarModulos();
  if (user.isSuperAdmin) {
    return { isSuperAdmin: true, rol: user.rol, permisos: TODOS_LOS_PERMISOS(modulos) };
  }
  const propios = await repo.obtenerPermisosUsuario(user.supabaseUserId);
  // Un módulo no asignable (Accesos, Administradores) nunca llega a un usuario común, aunque hubiera una fila suelta.
  const noAsignables = new Set(modulos.filter((m) => !m.asignable).map((m) => m.id));
  return { isSuperAdmin: false, rol: user.rol, permisos: propios.filter((p) => !noAsignables.has(p.moduloId)) };
}

export async function listarModulos(): Promise<repo.Modulo[]> {
  return repo.listarModulos();
}

export async function listarUsuarios(): Promise<UsuarioConAccesos[]> {
  const [usuarios, permisosDeTodos] = await Promise.all([repo.listarUsuariosBackoffice(), repo.obtenerPermisosDeTodos()]);
  return usuarios.map((u) => ({
    id: u.id,
    username: u.username,
    rol: u.rol,
    activo: u.activo,
    esSuperAdmin: SUPER_ADMIN_IDS.includes(u.id),
    permisos: permisosDeTodos.get(u.id) ?? [],
  }));
}

/**
 * Guarda los permisos de un usuario. Reglas (todas verificadas acá, nunca solo en la pantalla):
 *  - Solo un Super Admin llega hasta acá (lo exige la ruta con `requireSuperAdmin`).
 *  - No se tocan los permisos de otro Super Admin: ya tiene todo y no se le puede quitar.
 *  - El destinatario tiene que ser un usuario de backoffice (rol admin/staff).
 *  - Solo se asignan módulos que existen y son asignables.
 *  - Crear / editar / eliminar implican "ver": si falta, se rechaza en vez de adivinar.
 */
export async function guardarPermisos(actor: AuthUser, usuarioId: string, permisos: repo.PermisoModulo[]): Promise<repo.PermisoModulo[]> {
  if (SUPER_ADMIN_IDS.includes(usuarioId)) {
    throw new HttpError(StatusCodes.FORBIDDEN, 'Una cuenta Super Admin tiene acceso total y no se puede modificar.');
  }
  const perfil = await repo.obtenerPerfilBackoffice(usuarioId);
  if (!perfil) throw new HttpError(StatusCodes.NOT_FOUND, 'Usuario no encontrado.');
  if (perfil.rol !== 'admin' && perfil.rol !== 'staff') {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Ese usuario no tiene acceso al backoffice. Dale acceso primero desde Administradores.');
  }

  const modulos = await repo.listarModulos();
  const asignables = new Set(modulos.filter((m) => m.asignable).map((m) => m.id));
  const vistos = new Set<string>();
  for (const p of permisos) {
    if (!asignables.has(p.moduloId)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, `El módulo "${p.moduloId}" no existe o no se puede asignar.`);
    }
    if (vistos.has(p.moduloId)) throw new HttpError(StatusCodes.BAD_REQUEST, `El módulo "${p.moduloId}" está repetido.`);
    vistos.add(p.moduloId);
    if (!p.ver && (p.crear || p.editar || p.eliminar)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, `En "${p.moduloId}" no se puede crear, editar o eliminar sin poder ver.`);
    }
  }

  const antes = await repo.obtenerPermisosUsuario(usuarioId);
  await repo.reemplazarPermisosUsuario(usuarioId, permisos, actor.supabaseUserId);
  await auditService.registrarAuditoria(actor, {
    accion: 'editar',
    tabla: 'modulo_usuario',
    registroId: usuarioId,
    descripcion: `Cambió los accesos de "${perfil.username}"`,
    datosPrevios: { permisos: antes },
    datosNuevos: { permisos },
  });
  return repo.obtenerPermisosUsuario(usuarioId);
}

/** Alguien recibe acceso al backoffice: arranca con lo mínimo (ver el Dashboard) hasta que el Super Admin le asigne más. */
export async function darPermisosIniciales(actor: AuthUser, usuarioId: string): Promise<void> {
  await repo.otorgarPermisosIniciales(usuarioId, actor.supabaseUserId);
}

/** Alguien pierde el acceso al backoffice: se le borran todos sus permisos. */
export async function quitarPermisos(usuarioId: string): Promise<void> {
  await repo.borrarPermisosUsuario(usuarioId);
}
