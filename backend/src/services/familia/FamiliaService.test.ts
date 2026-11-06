import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/familiaRepository', () => ({
  contarResidentesDeOrganizacion: vi.fn(),
  obtenerFamiliarPorEmail: vi.fn(),
  obtenerFamiliar: vi.fn(),
  invitarPorEmail: vi.fn(),
  crearFamiliar: vi.fn(),
  eliminarCuentaAuth: vi.fn(),
  crearOReactivarVinculo: vi.fn(),
  obtenerVinculo: vi.fn(),
  cambiarEstadoVinculo: vi.fn(),
  listarRecordatoriosResidente: vi.fn(),
  obtenerOrganizacion: vi.fn(),
  registrarAcceso: vi.fn(),
  marcarInvitado: vi.fn(),
}));
vi.mock('../../repositories/familiaContenidoRepository', () => ({}));
vi.mock('../../repositories/familiaComunicacionRepository', () => ({}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('../horariosExternos/HorariosExternosService', () => ({
  obtenerSnapshot: vi.fn(),
  normalizarDia: (d: string) => d.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase(),
}));
vi.mock('../../config/feedHorarios', () => ({ feedAplicaA: vi.fn(() => true) }));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as repo from '../../repositories/familiaRepository';
import * as horarios from '../horariosExternos/HorariosExternosService';
import { feedAplicaA } from '../../config/feedHorarios';
import { agendaDelResidente, crearFamiliar, revocarVinculo } from './FamiliaService';
import type { AuthUser } from '../../middlewares/auth';
import type { FamiliarContext } from '../../utils/familia';

const staff: AuthUser = { supabaseUserId: 'staff-1', email: 's@x.com', residenteId: null, organizacionId: 'org-1', rol: 'admin', activo: true, isSuperAdmin: false };

const familiar: repo.Familiar = { id: 'fam-1', organizacion_id: 'org-1', nombre: 'Ana', apellido: 'Pérez', email: 'ana@familia.com', telefono: null, activo: true, invitado_en: null, ultimo_acceso: null, created_at: '' };

const input = { nombre: 'Ana', apellido: 'Pérez', email: 'ana@familia.com', telefono: null, residentes: [{ residenteId: 'res-1', parentesco: 'Hija' }] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.contarResidentesDeOrganizacion).mockResolvedValue(1);
  vi.mocked(repo.obtenerFamiliarPorEmail).mockResolvedValue(null);
  vi.mocked(repo.invitarPorEmail).mockResolvedValue({ ok: true, userId: 'fam-1' });
  vi.mocked(repo.crearFamiliar).mockResolvedValue(familiar);
  vi.mocked(repo.eliminarCuentaAuth).mockResolvedValue(undefined);
});

describe('crearFamiliar', () => {
  it('da de alta, manda la invitación y crea el vínculo', async () => {
    const r = await crearFamiliar(staff, input);
    expect(r.yaExistia).toBe(false);
    expect(repo.invitarPorEmail).toHaveBeenCalledWith('ana@familia.com');
    expect(repo.crearOReactivarVinculo).toHaveBeenCalledWith({ organizacionId: 'org-1', familiarId: 'fam-1', residenteId: 'res-1', parentesco: 'Hija', creadoPor: 'staff-1' });
  });

  it('rechaza un residente que no es de la institución, sin crear nada', async () => {
    vi.mocked(repo.contarResidentesDeOrganizacion).mockResolvedValue(0);
    await expect(crearFamiliar(staff, input)).rejects.toThrow('no existe en esta institución');
    expect(repo.invitarPorEmail).not.toHaveBeenCalled();
    expect(repo.crearOReactivarVinculo).not.toHaveBeenCalled();
  });

  it('un email que ya es familiar de OTRA institución da conflicto', async () => {
    vi.mocked(repo.obtenerFamiliarPorEmail).mockResolvedValue({ ...familiar, organizacion_id: 'org-2' });
    await expect(crearFamiliar(staff, input)).rejects.toThrow('otra institución');
    expect(repo.crearOReactivarVinculo).not.toHaveBeenCalled();
  });

  it('si el familiar ya existe en la institución solo suma el vínculo (sin invitar de nuevo)', async () => {
    vi.mocked(repo.obtenerFamiliarPorEmail).mockResolvedValue(familiar);
    const r = await crearFamiliar(staff, input);
    expect(r.yaExistia).toBe(true);
    expect(repo.invitarPorEmail).not.toHaveBeenCalled();
    expect(repo.crearOReactivarVinculo).toHaveBeenCalledTimes(1);
  });

  it('un email que ya tiene cuenta de un residente o del personal da conflicto', async () => {
    vi.mocked(repo.invitarPorEmail).mockResolvedValue({ ok: false, motivo: 'ya_registrado' });
    await expect(crearFamiliar(staff, input)).rejects.toThrow('ya tiene una cuenta');
    expect(repo.crearFamiliar).not.toHaveBeenCalled();
  });

  it('si falla la ficha, deshace la cuenta de acceso para no dejar huérfanos', async () => {
    vi.mocked(repo.crearFamiliar).mockRejectedValue(new Error('boom'));
    await expect(crearFamiliar(staff, input)).rejects.toThrow('boom');
    expect(repo.eliminarCuentaAuth).toHaveBeenCalledWith('fam-1');
  });

  it('exige que quien da de alta tenga institución', async () => {
    await expect(crearFamiliar({ ...staff, organizacionId: null }, input)).rejects.toThrow('organización');
  });
});

describe('revocarVinculo', () => {
  it('revoca un vínculo de la propia institución', async () => {
    vi.mocked(repo.obtenerVinculo).mockResolvedValue({ id: 'v1', organizacion_id: 'org-1', familiar_id: 'fam-1', residente_id: 'res-1', parentesco: null, activo: true, revocado_en: null, created_at: '', residente: null });
    await revocarVinculo(staff, 'v1');
    expect(repo.cambiarEstadoVinculo).toHaveBeenCalledWith('v1', false, 'staff-1');
  });

  it('un vínculo de OTRA institución no se puede tocar (404)', async () => {
    vi.mocked(repo.obtenerVinculo).mockResolvedValue({ id: 'v1', organizacion_id: 'org-2', familiar_id: 'f', residente_id: 'r', parentesco: null, activo: true, revocado_en: null, created_at: '', residente: null });
    await expect(revocarVinculo(staff, 'v1')).rejects.toThrow('Vínculo no encontrado');
    expect(repo.cambiarEstadoVinculo).not.toHaveBeenCalled();
  });
});

describe('agendaDelResidente', () => {
  const ctx: FamiliarContext = {
    familiarId: 'fam-1',
    organizacionId: 'org-1',
    nombre: 'Ana',
    apellido: 'P',
    email: 'a@b.com',
    vinculos: [{ vinculoId: 'v1', residenteId: 'res-1', parentesco: null, nombre: 'Rosa', apellido: 'G', seccion: '1 AC' }],
  };
  const act = (id: number, sectores: string[]) => ({ id, nombre: `Act ${id}`, dia: 'lunes', hora: '10:00', horario: '10:00 hs', lugar: null, sectores, tallerista: null, estado: 'ok', suspendido: false });

  it('muestra las actividades de SU piso (y las de todo el hogar) y los recordatorios, por separado', async () => {
    vi.mocked(horarios.obtenerSnapshot).mockResolvedValue({ generadoEn: null, actualizadoEn: '', actividades: [act(1, ['1AC']), act(2, ['3ABC']), act(3, [])] });
    vi.mocked(repo.listarRecordatoriosResidente).mockResolvedValue([{ id: 'r1', titulo: 'Llamar a Juan', fecha: '2026-11-10', hora: '10:00:00', estado: 'pendiente' }]);

    const r = await agendaDelResidente(ctx, 'res-1', { desde: '2026-11-01', hasta: '2026-11-30' });

    expect(r.actividades.map((a) => a.id)).toEqual([1, 3]);
    expect(r.recordatorios).toHaveLength(1);
    expect(repo.listarRecordatoriosResidente).toHaveBeenCalledWith('org-1', 'res-1', '2026-11-01', '2026-11-30');
  });

  it('NO deja ver la agenda de un residente al que no está vinculado, y ni siquiera consulta la base', async () => {
    await expect(agendaDelResidente(ctx, 'res-ajeno', { desde: '2026-11-01', hasta: '2026-11-30' })).rejects.toThrow('No encontramos a ese residente');
    expect(repo.listarRecordatoriosResidente).not.toHaveBeenCalled();
    expect(horarios.obtenerSnapshot).not.toHaveBeenCalled();
  });

  it('una institución que NO es dueña del feed del Hogar no recibe la grilla de otra', async () => {
    vi.mocked(feedAplicaA).mockReturnValueOnce(false);
    vi.mocked(repo.listarRecordatoriosResidente).mockResolvedValue([]);
    const r = await agendaDelResidente(ctx, 'res-1', { desde: '2026-11-01', hasta: '2026-11-30' });
    expect(r.actividades).toEqual([]);
    expect(horarios.obtenerSnapshot).not.toHaveBeenCalled();
  });

  it('si el sistema del Hogar no responde, igual muestra los recordatorios y avisa', async () => {
    vi.mocked(horarios.obtenerSnapshot).mockRejectedValue(new Error('feed caído'));
    vi.mocked(repo.listarRecordatoriosResidente).mockResolvedValue([]);
    const r = await agendaDelResidente(ctx, 'res-1', { desde: '2026-11-01', hasta: '2026-11-30' });
    expect(r.actividades).toEqual([]);
    expect(r.actividadesDisponibles).toBe(false);
  });
});
