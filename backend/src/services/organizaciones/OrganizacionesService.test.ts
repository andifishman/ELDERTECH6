import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/organizacionesRepository', () => ({
  obtenerDetalle: vi.fn(),
  actualizar: vi.fn(),
  listarTodasConDetalle: vi.fn(),
}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as repo from '../../repositories/organizacionesRepository';
import * as audit from '../audit/AuditService';
import { actualizar } from './OrganizacionesService';
import type { AuthUser } from '../../middlewares/auth';

const superAdmin: AuthUser = { supabaseUserId: 'sa', email: 'sa@x.com', residenteId: null, organizacionId: 'org-1', rol: 'residente', activo: true, isSuperAdmin: true };
const detalle = (p: Partial<repo.OrganizacionDetalle> = {}): repo.OrganizacionDetalle => ({
  id: 'org-2', nombre: 'Los Aromos', ciudad: 'Rosario', direccion: null, telefono: null, email: null, provincia: null, activo: true, colorPrincipal: null, ...p,
});

beforeEach(() => vi.clearAllMocks());

describe('actualizar institución', () => {
  it('guarda el cambio de color y deja registro en la auditoría', async () => {
    vi.mocked(repo.obtenerDetalle).mockResolvedValue(detalle());
    vi.mocked(repo.actualizar).mockResolvedValue(detalle({ colorPrincipal: '#1F6F5C' }));
    const r = await actualizar(superAdmin, 'org-2', { colorPrincipal: '#1F6F5C' });
    expect(r.colorPrincipal).toBe('#1F6F5C');
    expect(repo.actualizar).toHaveBeenCalledWith('org-2', { colorPrincipal: '#1F6F5C' });
    expect(audit.registrarAuditoria).toHaveBeenCalledWith(superAdmin, expect.objectContaining({ tabla: 'organizaciones', registroId: 'org-2', accion: 'editar' }));
  });

  it('una institución que no existe da 404 y no escribe nada', async () => {
    vi.mocked(repo.obtenerDetalle).mockResolvedValue(null);
    await expect(actualizar(superAdmin, 'org-9', { nombre: 'X' })).rejects.toThrow('no encontrada');
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('si la migración del color no está aplicada, lo dice claro en vez de un error técnico', async () => {
    vi.mocked(repo.obtenerDetalle).mockResolvedValue(detalle());
    vi.mocked(repo.actualizar).mockResolvedValue('sin_columna');
    await expect(actualizar(superAdmin, 'org-2', { colorPrincipal: '#1F6F5C' })).rejects.toThrow('migración');
    expect(audit.registrarAuditoria).not.toHaveBeenCalled();
  });
});
