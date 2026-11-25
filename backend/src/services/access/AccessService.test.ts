import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/accessRepository', () => ({
  listarModulos: vi.fn(),
  obtenerPerfilBackoffice: vi.fn(),
  obtenerPermisosUsuario: vi.fn(),
  reemplazarPermisosUsuario: vi.fn(),
  listarUsuariosBackoffice: vi.fn(),
  obtenerPermisosDeTodos: vi.fn(),
  borrarPermisosUsuario: vi.fn(),
  otorgarPermisosIniciales: vi.fn(),
}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as repo from '../../repositories/accessRepository';
import { SUPER_ADMIN_IDS } from '../../config/superAdmins';
import { ADMIN_INSTITUCION_IDS } from '../../config/superAdmins';
import { guardarPermisos, listarUsuarios, obtenerMisPermisos } from './AccessService';
import type { AuthUser } from '../../middlewares/auth';

const [ID_SUPER_1 = 'super-1'] = SUPER_ADMIN_IDS;

const superAdmin: AuthUser = {
  supabaseUserId: ID_SUPER_1,
  email: 'eldertech6@gmail.com',
  residenteId: null,
  organizacionId: 'org',
  rol: 'residente',
  activo: true,
  isSuperAdmin: true,
};

const adminLedor: AuthUser = {
  supabaseUserId: ADMIN_INSTITUCION_IDS[0] as string,
  email: null,
  residenteId: null,
  organizacionId: 'ledor',
  rol: 'admin',
  activo: true,
  isSuperAdmin: false,
  isAdminInstitucion: true,
};

const modulos = [
  { id: 'tutoriales', nombre: 'Tutoriales', descripcion: null, orden: 1, asignable: true, activo: true },
  { id: 'accesos', nombre: 'Accesos', descripcion: null, orden: 2, asignable: false, activo: true },
];
const p = (moduloId: string, ver: boolean, crear = false, editar = false, eliminar = false) => ({ moduloId, ver, crear, editar, eliminar });

describe('guardarPermisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.listarModulos).mockResolvedValue(modulos);
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue({ id: 'juan', username: 'juan', rol: 'admin', activo: true });
    vi.mocked(repo.obtenerPermisosUsuario).mockResolvedValue([]);
  });

  it('guarda permisos válidos', async () => {
    await guardarPermisos(superAdmin, 'juan', [p('tutoriales', true, true, true, false)]);
    expect(repo.reemplazarPermisosUsuario).toHaveBeenCalledWith('juan', [p('tutoriales', true, true, true, false)], superAdmin.supabaseUserId);
  });

  it('no deja modificar a una cuenta Super Admin', async () => {
    await expect(guardarPermisos(superAdmin, ID_SUPER_1, [p('tutoriales', true)])).rejects.toMatchObject({ status: 403 });
    expect(repo.reemplazarPermisosUsuario).not.toHaveBeenCalled();
  });

  it('no deja asignar módulos no asignables (Accesos)', async () => {
    await expect(guardarPermisos(superAdmin, 'juan', [p('accesos', true, true, true, true)])).rejects.toMatchObject({ status: 400 });
    expect(repo.reemplazarPermisosUsuario).not.toHaveBeenCalled();
  });

  it('no deja asignar módulos que no existen', async () => {
    await expect(guardarPermisos(superAdmin, 'juan', [p('inventado', true)])).rejects.toMatchObject({ status: 400 });
  });

  it('rechaza crear/editar/eliminar sin "ver"', async () => {
    await expect(guardarPermisos(superAdmin, 'juan', [p('tutoriales', false, false, true)])).rejects.toMatchObject({ status: 400 });
    expect(repo.reemplazarPermisosUsuario).not.toHaveBeenCalled();
  });

  it('rechaza módulos repetidos', async () => {
    await expect(guardarPermisos(superAdmin, 'juan', [p('tutoriales', true), p('tutoriales', true, true)])).rejects.toMatchObject({ status: 400 });
  });

  it('rechaza darle permisos a quien no tiene acceso al backoffice (residente)', async () => {
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue({ id: 'maria', username: 'maria', rol: 'residente', activo: true });
    await expect(guardarPermisos(superAdmin, 'maria', [p('tutoriales', true)])).rejects.toMatchObject({ status: 400 });
  });

  it('usuario inexistente → 404', async () => {
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue(null);
    await expect(guardarPermisos(superAdmin, 'nadie', [])).rejects.toMatchObject({ status: 404 });
  });
});

describe('obtenerMisPermisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.listarModulos).mockResolvedValue(modulos);
  });

  it('el Super Admin recibe todo, incluidos los módulos no asignables', async () => {
    const r = await obtenerMisPermisos(superAdmin);
    expect(r.isSuperAdmin).toBe(true);
    expect(r.permisos.map((x) => x.moduloId)).toEqual(['tutoriales', 'accesos']);
    expect(r.permisos.every((x) => x.ver && x.crear && x.editar && x.eliminar)).toBe(true);
  });

  it('un admin común nunca recibe un módulo no asignable, aunque haya una fila suelta en la base', async () => {
    vi.mocked(repo.obtenerPermisosUsuario).mockResolvedValue([p('tutoriales', true), p('accesos', true, true, true, true)]);
    const r = await obtenerMisPermisos({ ...superAdmin, isSuperAdmin: false, supabaseUserId: 'juan' });
    expect(r.permisos.map((x) => x.moduloId)).toEqual(['tutoriales']);
  });
});

describe('super admin de institución', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.listarModulos).mockResolvedValue(modulos);
    vi.mocked(repo.obtenerPermisosUsuario).mockResolvedValue([]);
    vi.mocked(repo.reemplazarPermisosUsuario).mockResolvedValue(undefined as never);
  });

  it('recibe todos los módulos (Accesos incluido) pero no figura como Super Super Admin', async () => {
    const r = await obtenerMisPermisos(adminLedor);
    expect(r.isSuperAdmin).toBe(false);
    expect(r.permisos.map((x) => x.moduloId)).toEqual(['tutoriales', 'accesos']);
  });

  it('lista solo a los usuarios de su institución', async () => {
    vi.mocked(repo.listarUsuariosBackoffice).mockResolvedValue([]);
    vi.mocked(repo.obtenerPermisosDeTodos).mockResolvedValue(new Map());
    await listarUsuarios(adminLedor);
    expect(repo.listarUsuariosBackoffice).toHaveBeenCalledWith('ledor');
  });

  it('el Super Super Admin lista a todas las instituciones', async () => {
    vi.mocked(repo.listarUsuariosBackoffice).mockResolvedValue([]);
    vi.mocked(repo.obtenerPermisosDeTodos).mockResolvedValue(new Map());
    await listarUsuarios(superAdmin);
    expect(repo.listarUsuariosBackoffice).toHaveBeenCalledWith(null);
  });

  it('puede cambiar permisos de alguien de su institución', async () => {
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue({ id: 'juan', username: 'juan', rol: 'admin', activo: true, organizacion_id: 'ledor' });
    await guardarPermisos(adminLedor, 'juan', [p('tutoriales', true)]);
    expect(repo.reemplazarPermisosUsuario).toHaveBeenCalled();
  });

  it('NO puede tocar a alguien de otra institución (responde como si no existiera)', async () => {
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue({ id: 'ana', username: 'ana', rol: 'admin', activo: true, organizacion_id: 'otra' });
    await expect(guardarPermisos(adminLedor, 'ana', [p('tutoriales', true)])).rejects.toMatchObject({ status: 404 });
    expect(repo.reemplazarPermisosUsuario).not.toHaveBeenCalled();
  });

  it('NO puede modificar a otro super admin de institución ni al Super Super Admin', async () => {
    await expect(guardarPermisos(adminLedor, ADMIN_INSTITUCION_IDS[1] as string, [p('tutoriales', true)])).rejects.toMatchObject({ status: 403 });
    await expect(guardarPermisos(adminLedor, ID_SUPER_1, [p('tutoriales', true)])).rejects.toMatchObject({ status: 403 });
  });

  it('el Super Super Admin sí puede tocar a alguien de cualquier institución', async () => {
    vi.mocked(repo.obtenerPerfilBackoffice).mockResolvedValue({ id: 'ana', username: 'ana', rol: 'admin', activo: true, organizacion_id: 'otra' });
    await guardarPermisos(superAdmin, 'ana', [p('tutoriales', true)]);
    expect(repo.reemplazarPermisosUsuario).toHaveBeenCalled();
  });
});
