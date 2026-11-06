import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/familiaAccesoRepository', () => ({
  listarInstitucionesActivas: vi.fn(),
  contarPendientes: vi.fn(),
  registrarSolicitud: vi.fn(),
  listarSolicitudes: vi.fn(),
  obtenerSolicitud: vi.fn(),
  resolverSolicitud: vi.fn(),
}));
vi.mock('../../repositories/familiaRepository', () => ({ obtenerFamiliarPorEmail: vi.fn() }));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('./FamiliaService', () => ({ crearFamiliar: vi.fn() }));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as accesoRepo from '../../repositories/familiaAccesoRepository';
import * as familiaRepo from '../../repositories/familiaRepository';
import { crearFamiliar } from './FamiliaService';
import { aprobarSolicitud, MAX_PENDIENTES, rechazarSolicitud, solicitarAcceso, verificarEmail } from './FamiliaAccesoService';
import type { AuthUser } from '../../middlewares/auth';

const staff: AuthUser = { supabaseUserId: 'staff-1', email: 's@x.com', residenteId: null, organizacionId: 'org-1', rol: 'admin', activo: true, isSuperAdmin: false };
const familiar = { id: 'fam-1', organizacion_id: 'org-1', nombre: 'Ana', apellido: 'P', email: 'ana@x.com', telefono: null, activo: true, invitado_en: null, ultimo_acceso: null, created_at: '' };
const solicitud: accesoRepo.SolicitudAcceso = {
  id: 'sol-1', organizacion_id: 'org-1', email: 'nuevo@x.com', nombre: 'Nuevo', apellido: 'Fam', telefono: null, residente_texto: 'Rosa Gómez', parentesco: 'Hijo',
  estado: 'pendiente', intentos: 1, familiar_id: null, resuelto_en: null, created_at: '', updated_at: '',
};
const pedido = { email: 'Nuevo@X.com', nombre: 'Nuevo', apellido: 'Fam', telefono: null, residenteTexto: 'Rosa Gómez', parentesco: 'Hijo' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(familiaRepo.obtenerFamiliarPorEmail).mockResolvedValue(null);
  vi.mocked(accesoRepo.listarInstitucionesActivas).mockResolvedValue([{ id: 'org-1', nombre: 'Ledor Vador' }]);
  vi.mocked(accesoRepo.contarPendientes).mockResolvedValue(0);
  vi.mocked(accesoRepo.registrarSolicitud).mockResolvedValue({ id: 'sol-1', nueva: true });
  vi.mocked(accesoRepo.resolverSolicitud).mockResolvedValue(true);
});

describe('verificarEmail (público)', () => {
  it('un email dado de alta es "registrado" y no devuelve nada más', async () => {
    vi.mocked(familiaRepo.obtenerFamiliarPorEmail).mockResolvedValue(familiar);
    expect(await verificarEmail('ANA@x.com')).toEqual({ estado: 'registrado', instituciones: [] });
    expect(familiaRepo.obtenerFamiliarPorEmail).toHaveBeenCalledWith('ana@x.com');
  });

  it('una cuenta deshabilitada se avisa distinto y no abre solicitud', async () => {
    vi.mocked(familiaRepo.obtenerFamiliarPorEmail).mockResolvedValue({ ...familiar, activo: false });
    expect((await verificarEmail('ana@x.com')).estado).toBe('deshabilitado');
  });

  it('un email desconocido es "no_registrado" y trae las residencias para elegir', async () => {
    const r = await verificarEmail('nadie@x.com');
    expect(r.estado).toBe('no_registrado');
    expect(r.instituciones).toEqual([{ id: 'org-1', nombre: 'Ledor Vador' }]);
  });
});

describe('solicitarAcceso (público)', () => {
  it('con una sola residencia la asigna sola y guarda el email en minúsculas', async () => {
    await solicitarAcceso(pedido);
    expect(accesoRepo.registrarSolicitud).toHaveBeenCalledWith(expect.objectContaining({ organizacionId: 'org-1', email: 'nuevo@x.com', residenteTexto: 'Rosa Gómez' }));
  });

  it('con varias residencias exige elegir una, y rechaza una que no existe', async () => {
    vi.mocked(accesoRepo.listarInstitucionesActivas).mockResolvedValue([{ id: 'org-1', nombre: 'A' }, { id: 'org-2', nombre: 'B' }]);
    await expect(solicitarAcceso(pedido)).rejects.toThrow('Elegí a qué residencia');
    await expect(solicitarAcceso({ ...pedido, organizacionId: 'org-9' })).rejects.toThrow('no existe');
    await solicitarAcceso({ ...pedido, organizacionId: 'org-2' });
    expect(accesoRepo.registrarSolicitud).toHaveBeenCalledWith(expect.objectContaining({ organizacionId: 'org-2' }));
  });

  it('quien ya está dado de alta no genera una solicitud', async () => {
    vi.mocked(familiaRepo.obtenerFamiliarPorEmail).mockResolvedValue(familiar);
    await expect(solicitarAcceso(pedido)).rejects.toThrow('ya está dado de alta');
    expect(accesoRepo.registrarSolicitud).not.toHaveBeenCalled();
  });

  it('una cuenta deshabilitada no se puede "reabrir" por esta vía', async () => {
    vi.mocked(familiaRepo.obtenerFamiliarPorEmail).mockResolvedValue({ ...familiar, activo: false });
    await expect(solicitarAcceso(pedido)).rejects.toThrow('deshabilitado');
    expect(accesoRepo.registrarSolicitud).not.toHaveBeenCalled();
  });

  it('frena cuando la bandeja ya tiene demasiados pendientes', async () => {
    vi.mocked(accesoRepo.contarPendientes).mockResolvedValue(MAX_PENDIENTES);
    await expect(solicitarAcceso(pedido)).rejects.toThrow('demasiadas solicitudes');
    expect(accesoRepo.registrarSolicitud).not.toHaveBeenCalled();
  });
});

describe('aprobar y rechazar (backoffice)', () => {
  const datos = { nombre: 'Nuevo', apellido: 'Fam', telefono: null, residentes: [{ residenteId: 'res-1', parentesco: 'Hijo' }] };

  it('aprobar da de alta con el email DE LA SOLICITUD y la cierra', async () => {
    vi.mocked(accesoRepo.obtenerSolicitud).mockResolvedValue(solicitud);
    vi.mocked(crearFamiliar).mockResolvedValue({ familiar: { ...familiar, id: 'fam-9' }, yaExistia: false });
    const r = await aprobarSolicitud(staff, 'sol-1', datos);
    expect(crearFamiliar).toHaveBeenCalledWith(staff, expect.objectContaining({ email: 'nuevo@x.com' }));
    expect(accesoRepo.resolverSolicitud).toHaveBeenCalledWith('sol-1', 'aprobada', 'staff-1', 'fam-9');
    expect(r.familiarId).toBe('fam-9');
  });

  it('una solicitud de otra institución o ya resuelta no se puede tocar', async () => {
    vi.mocked(accesoRepo.obtenerSolicitud).mockResolvedValue({ ...solicitud, organizacion_id: 'org-2' });
    await expect(aprobarSolicitud(staff, 'sol-1', datos)).rejects.toThrow('no encontrada');
    vi.mocked(accesoRepo.obtenerSolicitud).mockResolvedValue({ ...solicitud, estado: 'aprobada' });
    await expect(rechazarSolicitud(staff, 'sol-1')).rejects.toThrow('ya fue resuelta');
    expect(crearFamiliar).not.toHaveBeenCalled();
    expect(accesoRepo.resolverSolicitud).not.toHaveBeenCalled();
  });

  it('si el alta falla, la solicitud queda pendiente', async () => {
    vi.mocked(accesoRepo.obtenerSolicitud).mockResolvedValue(solicitud);
    vi.mocked(crearFamiliar).mockRejectedValue(new Error('no se pudo invitar'));
    await expect(aprobarSolicitud(staff, 'sol-1', datos)).rejects.toThrow('no se pudo invitar');
    expect(accesoRepo.resolverSolicitud).not.toHaveBeenCalled();
  });

  it('rechazar la cierra como rechazada', async () => {
    vi.mocked(accesoRepo.obtenerSolicitud).mockResolvedValue(solicitud);
    await rechazarSolicitud(staff, 'sol-1');
    expect(accesoRepo.resolverSolicitud).toHaveBeenCalledWith('sol-1', 'rechazada', 'staff-1', null);
  });
});
