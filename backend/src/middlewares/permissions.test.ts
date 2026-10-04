import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../repositories/accessRepository', () => ({
  obtenerPermisosUsuario: vi.fn(),
}));
vi.mock('../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as accessRepo from '../repositories/accessRepository';
import { requirePermission, requireSuperAdmin, tienePermiso } from './permissions';
import type { AuthUser } from './auth';

const permiso = (moduloId: string, ver: boolean, crear = false, editar = false, eliminar = false) => ({ moduloId, ver, crear, editar, eliminar });

function usuario(parcial: Partial<AuthUser> = {}): AuthUser {
  return {
    supabaseUserId: 'u1',
    email: 'juan@test.com',
    residenteId: null,
    organizacionId: 'org',
    rol: 'admin',
    activo: true,
    isSuperAdmin: false,
    ...parcial,
  };
}

function ejecutar(middleware: (req: Request, res: Response, next: NextFunction) => unknown, user?: AuthUser) {
  const req = { user, path: '/x', method: 'DELETE' } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn().mockReturnValue({ json }), } as unknown as Response;
  const next = vi.fn();
  return Promise.resolve(middleware(req, res, next)).then(() => ({ res, json, next }));
}

describe('tienePermiso', () => {
  it('sin fila para el módulo → no puede nada', () => {
    expect(tienePermiso([], 'tutoriales', 'ver')).toBe(false);
  });
  it('"ver" solo → ve pero no crea, edita ni elimina', () => {
    const p = [permiso('tutoriales', true)];
    expect(tienePermiso(p, 'tutoriales', 'ver')).toBe(true);
    expect(tienePermiso(p, 'tutoriales', 'crear')).toBe(false);
    expect(tienePermiso(p, 'tutoriales', 'editar')).toBe(false);
    expect(tienePermiso(p, 'tutoriales', 'eliminar')).toBe(false);
  });
  it('editar sin eliminar → puede editar pero no eliminar', () => {
    const p = [permiso('tutoriales', true, false, true, false)];
    expect(tienePermiso(p, 'tutoriales', 'editar')).toBe(true);
    expect(tienePermiso(p, 'tutoriales', 'eliminar')).toBe(false);
  });
  it('una acción marcada sin "ver" no cuenta (no se puede operar un módulo que no se ve)', () => {
    const p = [permiso('tutoriales', false, true, true, true)];
    expect(tienePermiso(p, 'tutoriales', 'editar')).toBe(false);
  });
  it('los permisos de un módulo no se filtran a otro', () => {
    const p = [permiso('horarios', true, true, true, true)];
    expect(tienePermiso(p, 'tutoriales', 'ver')).toBe(false);
  });
});

describe('requirePermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin usuario autenticado → 401', async () => {
    const { res, next } = await ejecutar(requirePermission('tutoriales', 'ver'), undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('Super Admin pasa siempre, sin consultar la base', async () => {
    const { next } = await ejecutar(requirePermission('accesos', 'eliminar'), usuario({ isSuperAdmin: true }));
    expect(next).toHaveBeenCalled();
    expect(accessRepo.obtenerPermisosUsuario).not.toHaveBeenCalled();
  });

  it('usuario sin acceso al módulo → 403', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockResolvedValue([permiso('horarios', true)]);
    const { res, next } = await ejecutar(requirePermission('tutoriales', 'ver'), usuario());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('usuario con "ver" que intenta editar → 403', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockResolvedValue([permiso('tutoriales', true)]);
    const { res, next } = await ejecutar(requirePermission('tutoriales', 'editar'), usuario());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('usuario con "editar" que intenta eliminar → 403', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockResolvedValue([permiso('tutoriales', true, false, true, false)]);
    const { res, next } = await ejecutar(requirePermission('tutoriales', 'eliminar'), usuario());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('usuario con el permiso exacto → pasa', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockResolvedValue([permiso('tutoriales', true, true, true, true)]);
    const { next } = await ejecutar(requirePermission('tutoriales', 'eliminar'), usuario());
    expect(next).toHaveBeenCalled();
  });

  it('con varias acciones alcanza con cualquiera (ej. subir imagen = crear o editar)', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockResolvedValue([permiso('tutoriales', true, false, true, false)]);
    const { next } = await ejecutar(requirePermission('tutoriales', 'crear', 'editar'), usuario());
    expect(next).toHaveBeenCalled();
  });

  it('si no se pueden leer los permisos → 500 y NO deja pasar', async () => {
    vi.mocked(accessRepo.obtenerPermisosUsuario).mockRejectedValue(new Error('db caída'));
    const { res, next } = await ejecutar(requirePermission('tutoriales', 'ver'), usuario());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireSuperAdmin', () => {
  it('un administrador común no pasa', async () => {
    const { res, next } = await ejecutar(requireSuperAdmin, usuario());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('un Super Admin pasa', async () => {
    const { next } = await ejecutar(requireSuperAdmin, usuario({ isSuperAdmin: true }));
    expect(next).toHaveBeenCalled();
  });
});
