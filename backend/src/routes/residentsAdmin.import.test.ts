/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Se prueba la ruta real (multer + controlador + servicio + validación) con la base y la auth simuladas.
vi.mock('../middlewares/auth', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as { user: unknown }).user = { supabaseUserId: 'admin-1', organizacionId: 'org-1', rol: 'admin', isSuperAdmin: false, activo: true };
    (req as unknown as { token: string }).token = 'token-de-prueba';
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
vi.mock('../middlewares/permissions', () => ({ requirePermission: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next() }));
vi.mock('../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../utils/validators', async (original) => ({
  ...(await original<typeof import('../utils/validators')>()),
  requireToken: () => 'token-de-prueba',
}));
vi.mock('../repositories/residentsRepository', () => ({
  listarClavesExistentes: vi.fn(async () => ({ dnis: ['22222222'], usernames: ['aperez'] })),
  invocarAdminUsuarios: vi.fn(async (_t: string, body: Record<string, unknown>) => ({ id: `id-${String(body.username)}`, username: String(body.username) })),
  actualizarResidenteAdmin: vi.fn(async () => undefined),
  reemplazarIntereses: vi.fn(async () => undefined),
}));
vi.mock('../services/audit/AuditService', () => ({ registrarAuditoria: vi.fn(async () => undefined) }));

import * as repo from '../repositories/residentsRepository';
import { errorHandler } from '../middlewares/errorHandler';
import { residentsAdminRouter } from './residentsAdmin.routes';

let server: Server;
let base = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/residents', residentsAdminRouter);
  app.use(errorHandler);
  await new Promise<void>((ok) => { server = app.listen(0, ok); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin/residents`;
});
afterAll(() => { server.close(); });
beforeEach(() => vi.clearAllMocks());

async function excel(filas: string[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Residentes');
  hoja.addRow(['Nombre', 'Apellido', 'DNI', 'Sección']);
  filas.forEach((f) => hoja.addRow(f));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

function subir(contenido: Buffer | string, confirmar: boolean, nombre = 'residentes.xlsx') {
  const form = new FormData();
  form.append('archivo', new Blob([contenido as unknown as ArrayBuffer]), nombre);
  form.append('confirmar', String(confirmar));
  return fetch(`${base}/import`, { method: 'POST', body: form });
}

describe('GET /import/template', () => {
  it('devuelve un .xlsx descargable', async () => {
    const res = await fetch(`${base}/import/template`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    expect(res.headers.get('content-disposition')).toContain('plantilla-residentes-eldertech.xlsx');
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 2).toString()).toBe('PK');
  });
});

describe('POST /import', () => {
  it('sin confirmar valida y no crea a nadie', async () => {
    const res = await subir(await excel([['maria', 'lopez', '12.345.678', '1 ac']]), false);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.creados).toBeNull();
    expect(body.validacion.filas[0].datos).toMatchObject({ nombre: 'Maria', apellido: 'Lopez', dni: '12345678', seccion: '1 AC', username: 'mlopez' });
    expect(repo.invocarAdminUsuarios).not.toHaveBeenCalled();
  });

  it('con errores no crea a nadie ni siquiera confirmando', async () => {
    const res = await subir(await excel([
      ['Ana', 'Lopez', '11111111', '1 AC'],
      ['Beto', 'Diaz', '22222222', '1 AC'], // DNI ya existente
    ]), true);
    const body = (await res.json()) as any;
    expect(body.creados).toBeNull();
    expect(body.validacion.resumen).toMatchObject({ validas: 1, conErrores: 1 });
    expect(repo.invocarAdminUsuarios).not.toHaveBeenCalled();
  });

  it('confirmado y sin errores crea a todos con los datos normalizados', async () => {
    const res = await subir(await excel([
      ['ana', 'perez', '11.111.111', '2 b'],
      ['carlos', 'ruiz', '33333333', 'bait'],
    ]), true);
    const body = (await res.json()) as any;
    expect(body.creados).toHaveLength(2);
    expect(body.creados.every((c: { ok: boolean }) => c.ok)).toBe(true);
    expect(repo.invocarAdminUsuarios).toHaveBeenCalledTimes(2);
    expect(repo.invocarAdminUsuarios).toHaveBeenNthCalledWith(1, 'token-de-prueba', expect.objectContaining({
      accion: 'crear', nombre: 'Ana', apellido: 'Perez', dni: '11111111', seccion: '2 B', username: 'aperez2', organizacion_id: 'org-1',
    }));
  });

  it('informa la fila que falló al crear sin frenar las demás', async () => {
    vi.mocked(repo.invocarAdminUsuarios).mockRejectedValueOnce(new Error('Ese nombre de usuario ya está en uso'));
    const res = await subir(await excel([
      ['Ana', 'Gomez', '44444444', '1 AC'],
      ['Beto', 'Soto', '55555555', '1 AC'],
    ]), true);
    const body = (await res.json()) as any;
    expect(body.creados.map((c: { ok: boolean }) => c.ok)).toEqual([false, true]);
    expect(body.creados[0].error).toMatch(/ya está en uso/);
  });

  it('rechaza un archivo que no es la plantilla', async () => {
    const res = await subir('nombre,apellido\nA,B', false, 'datos.csv');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/no es un Excel/);
  });

  it('rechaza un pedido sin archivo', async () => {
    const res = await fetch(`${base}/import`, { method: 'POST', body: new FormData() });
    expect(res.status).toBe(400);
  });

  it('rechaza un archivo demasiado grande', async () => {
    const res = await subir(Buffer.alloc(5 * 1024 * 1024), false);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/demasiado grande/);
  });
});
