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
import { guardarPermisos, obtenerMisPermisos } from './AccessService';
import type { AuthUser } from '../../middlewares/auth';

const [ID_SUPER_1 = 'super-1', ID_SUPER_2 = 'super-2'] = SUPER_ADMIN_IDS;

const superAdmin: AuthUser = {
  supabaseUserId: ID_SUPER_1,
  email: 'andresfishman@gmail.com',
  residenteId: null,
  organizacionId: 'org',
  rol: 'residente',
  activo: true,
  isSuperAdmin: true,
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

  it('no deja modificar a otro Super Admin', async () => {
    await expect(guardarPermisos(superAdmin, ID_SUPER_2, [p('tutoriales', true)])).rejects.toMatchObject({ status: 403 });
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
