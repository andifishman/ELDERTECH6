import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/supabaseAdmin', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('../repositories/organizacionesRepository', () => ({ obtenerActiva: vi.fn() }));
vi.mock('../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as repo from '../repositories/organizacionesRepository';
import { ORGANIZACIONES_VALIDAS, organizacionElegida } from './auth';

const PROPIA = 'c0ddba5b-9d1e-4210-ad46-bfc37aba03bf';
const OTRA = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  vi.clearAllMocks();
  ORGANIZACIONES_VALIDAS.clear();
});

describe('organizacionElegida (selector de institución del super admin)', () => {
  it('sin header, o con el mismo id, se queda en la propia y no consulta la base', async () => {
    expect(await organizacionElegida(undefined, PROPIA)).toBe(PROPIA);
    expect(await organizacionElegida(PROPIA, PROPIA)).toBe(PROPIA);
    expect(repo.obtenerActiva).not.toHaveBeenCalled();
  });

  it('un valor que no es UUID se ignora (nada de inyectar texto raro)', async () => {
    expect(await organizacionElegida("x' or 1=1 --", PROPIA)).toBe(PROPIA);
    expect(await organizacionElegida(['a', 'b'], PROPIA)).toBe(PROPIA);
    expect(repo.obtenerActiva).not.toHaveBeenCalled();
  });

  it('una institución existente y activa se acepta', async () => {
    vi.mocked(repo.obtenerActiva).mockResolvedValue({ id: OTRA, nombre: 'Demo', ciudad: null, colorPrincipal: null });
    expect(await organizacionElegida(OTRA, PROPIA)).toBe(OTRA);
  });

  it('una institución inexistente o inactiva se ignora', async () => {
    vi.mocked(repo.obtenerActiva).mockResolvedValue(null);
    expect(await organizacionElegida(OTRA, PROPIA)).toBe(PROPIA);
  });

  it('una institución ya validada no vuelve a consultarse durante un rato', async () => {
    vi.mocked(repo.obtenerActiva).mockResolvedValue({ id: OTRA, nombre: 'Demo', ciudad: null, colorPrincipal: null });
    await organizacionElegida(OTRA, PROPIA);
    await organizacionElegida(OTRA, PROPIA);
    expect(repo.obtenerActiva).toHaveBeenCalledTimes(1);
  });
});
