import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../repositories/familiaRepository', () => ({
  obtenerFamiliar: vi.fn(),
  listarVinculosActivos: vi.fn(),
}));
vi.mock('../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as repo from '../repositories/familiaRepository';
import { requireFamiliar } from './familia';
import { exigirVinculo, exigirVinculoPorId, type FamiliarContext } from '../utils/familia';
import type { AuthUser } from './auth';

const usuario = (parcial: Partial<AuthUser> = {}): AuthUser => ({
  supabaseUserId: 'fam-1',
  email: 'ana@familia.com',
  residenteId: null,
  organizacionId: 'org-1',
  rol: 'familiar',
  activo: true,
  isSuperAdmin: false,
  ...parcial,
});

const ficha = (parcial: Partial<repo.Familiar> = {}): repo.Familiar => ({
  id: 'fam-1',
  organizacion_id: 'org-1',
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@familia.com',
  telefono: null,
  activo: true,
  invitado_en: null,
  ultimo_acceso: null,
  created_at: '',
  ...parcial,
});

async function ejecutar(user?: AuthUser) {
  const req = { user } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const next = vi.fn() as unknown as NextFunction;
  await requireFamiliar(req, { status } as unknown as Response, next);
  return { req, status, json, next };
}

beforeEach(() => vi.clearAllMocks());

describe('requireFamiliar', () => {
  it('deja pasar a un familiar activo y carga SOLO sus residentes vinculados', async () => {
    vi.mocked(repo.obtenerFamiliar).mockResolvedValue(ficha());
    vi.mocked(repo.listarVinculosActivos).mockResolvedValue([
      { id: 'v1', familiar_id: 'fam-1', residente_id: 'res-1', parentesco: 'Hija', activo: true, revocado_en: null, created_at: '', residente: { id: 'res-1', nombre: 'Rosa', apellido: 'Gómez', nombre_completo: null, seccion: '1 AC', habitacion: null } },
    ]);

    const { req, next, status } = await ejecutar(usuario());

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(req.familiar?.vinculos).toEqual([{ vinculoId: 'v1', residenteId: 'res-1', parentesco: 'Hija', nombre: 'Rosa', apellido: 'Gómez', seccion: '1 AC' }]);
  });

  it.each([
    ['un residente', usuario({ rol: 'residente', residenteId: 'res-9' })],
    ['un administrador', usuario({ rol: 'admin' })],
    ['un super admin que no es familiar', usuario({ rol: 'residente', isSuperAdmin: true })],
    ['una cuenta sin rol', usuario({ rol: null })],
    ['una cuenta deshabilitada', usuario({ activo: false })],
    ['una cuenta sin institución', usuario({ organizacionId: null })],
  ])('rechaza a %s con 403', async (_nombre, user) => {
    const { next, status } = await ejecutar(user);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(repo.obtenerFamiliar).not.toHaveBeenCalled();
  });

  it('rechaza si no hay request autenticada', async () => {
    const { status } = await ejecutar(undefined);
    expect(status).toHaveBeenCalledWith(403);
  });

  it.each([
    ['sin ficha de familiar', null],
    ['con la ficha deshabilitada', ficha({ activo: false })],
    ['con la ficha de OTRA institución', ficha({ organizacion_id: 'org-2' })],
  ])('rechaza a un familiar %s', async (_nombre, fila) => {
    vi.mocked(repo.obtenerFamiliar).mockResolvedValue(fila);
    const { status, next } = await ejecutar(usuario());
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(repo.listarVinculosActivos).not.toHaveBeenCalled();
  });

  it('un vínculo revocado no aparece: la lista sale de los vínculos activos en cada request', async () => {
    vi.mocked(repo.obtenerFamiliar).mockResolvedValue(ficha());
    vi.mocked(repo.listarVinculosActivos).mockResolvedValue([]);
    const { req } = await ejecutar(usuario());
    expect(req.familiar?.vinculos).toEqual([]);
  });

  it('si falla la base, pasa el error al manejador (nunca deja entrar)', async () => {
    vi.mocked(repo.obtenerFamiliar).mockRejectedValue(new Error('base caída'));
    const { next, status } = await ejecutar(usuario());
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('exigirVinculo', () => {
  const ctx: FamiliarContext = {
    familiarId: 'fam-1',
    organizacionId: 'org-1',
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'a@b.com',
    vinculos: [{ vinculoId: 'v1', residenteId: 'res-1', parentesco: null, nombre: 'Rosa', apellido: 'Gómez', seccion: null }],
  };

  it('devuelve el vínculo del residente propio', () => {
    expect(exigirVinculo(ctx, 'res-1').vinculoId).toBe('v1');
    expect(exigirVinculoPorId(ctx, 'v1').residenteId).toBe('res-1');
  });

  it('un residente ajeno da 404 (no 403: no se confirma que existe)', () => {
    expect(() => exigirVinculo(ctx, 'res-ajeno')).toThrow(expect.objectContaining({ status: 404 }));
    expect(() => exigirVinculoPorId(ctx, 'v-ajeno')).toThrow(expect.objectContaining({ status: 404 }));
  });
});
