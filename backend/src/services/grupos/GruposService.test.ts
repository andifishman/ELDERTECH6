import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/gruposRepository', () => ({
  listarGrupos: vi.fn(),
  obtenerGrupo: vi.fn(),
  obtenerGrupoPorNombre: vi.fn(),
  listarMiembros: vi.fn(),
  listarResidentesFueraDelGrupo: vi.fn(),
  crearGrupo: vi.fn(),
  actualizarGrupo: vi.fn(),
  eliminarGrupo: vi.fn(),
  agregarMiembros: vi.fn(),
  quitarMiembro: vi.fn(),
}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));

import * as repo from '../../repositories/gruposRepository';
import { actualizar, agregarMiembros, crear, eliminar, quitarMiembro } from './GruposService';
import type { AuthUser } from '../../middlewares/auth';

const user: AuthUser = {
  supabaseUserId: 'staff-1',
  email: 'staff@eldertech.com',
  residenteId: null,
  organizacionId: 'org-1',
  rol: 'admin',
  activo: true,
  isSuperAdmin: false,
};

const grupoSeccion = {
  id: 'g-seccion', organizacion_id: 'org-1', nombre: 'AC1', descripcion: null,
  tipo: 'seccion' as const, seccion: '1 AC', created_at: '', updated_at: '',
};
const grupoPersonalizado = {
  id: 'g-custom', organizacion_id: 'org-1', nombre: 'Taller de música', descripcion: 'Residentes del taller',
  tipo: 'personalizado' as const, seccion: null, created_at: '', updated_at: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('crear', () => {
  it('crea un grupo personalizado y agrega los integrantes iniciales', async () => {
    vi.mocked(repo.obtenerGrupoPorNombre).mockResolvedValue(null);
    vi.mocked(repo.crearGrupo).mockResolvedValue(grupoPersonalizado);

    await crear(user, 'Taller de música', 'Residentes del taller', ['r1', 'r2']);

    expect(repo.crearGrupo).toHaveBeenCalledWith('org-1', 'Taller de música', 'Residentes del taller');
    expect(repo.agregarMiembros).toHaveBeenCalledWith('g-custom', ['r1', 'r2']);
  });

  it('rechaza un nombre que ya existe', async () => {
    vi.mocked(repo.obtenerGrupoPorNombre).mockResolvedValue(grupoPersonalizado);
    await expect(crear(user, 'Taller de música', null, [])).rejects.toMatchObject({ status: 400 });
    expect(repo.crearGrupo).not.toHaveBeenCalled();
  });

  it('no llama a agregarMiembros si no se pasan integrantes', async () => {
    vi.mocked(repo.obtenerGrupoPorNombre).mockResolvedValue(null);
    vi.mocked(repo.crearGrupo).mockResolvedValue(grupoPersonalizado);
    await crear(user, 'Taller de música', null, []);
    expect(repo.agregarMiembros).not.toHaveBeenCalled();
  });
});

describe('actualizar', () => {
  it('permite cambiar la descripción de un grupo de sección', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoSeccion);
    vi.mocked(repo.actualizarGrupo).mockResolvedValue({ ...grupoSeccion, descripcion: 'nueva' });
    await actualizar(user, 'g-seccion', { descripcion: 'nueva' });
    expect(repo.actualizarGrupo).toHaveBeenCalledWith('g-seccion', { descripcion: 'nueva' });
  });

  it('rechaza cambiar el nombre de un grupo de sección', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoSeccion);
    await expect(actualizar(user, 'g-seccion', { nombre: 'OTRO' })).rejects.toMatchObject({ status: 400 });
    expect(repo.actualizarGrupo).not.toHaveBeenCalled();
  });

  it('rechaza renombrar a un nombre que ya usa otro grupo', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoPersonalizado);
    vi.mocked(repo.obtenerGrupoPorNombre).mockResolvedValue(grupoSeccion);
    await expect(actualizar(user, 'g-custom', { nombre: 'AC1' })).rejects.toMatchObject({ status: 400 });
  });

  it('grupo inexistente → 404', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(null);
    await expect(actualizar(user, 'nada', { descripcion: 'x' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('eliminar', () => {
  it('rechaza eliminar un grupo de sección', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoSeccion);
    await expect(eliminar(user, 'g-seccion')).rejects.toMatchObject({ status: 400 });
    expect(repo.eliminarGrupo).not.toHaveBeenCalled();
  });

  it('elimina un grupo personalizado', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoPersonalizado);
    await eliminar(user, 'g-custom');
    expect(repo.eliminarGrupo).toHaveBeenCalledWith('g-custom');
  });
});

describe('agregarMiembros / quitarMiembro', () => {
  it('rechaza sumar gente a mano a un grupo de sección', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoSeccion);
    await expect(agregarMiembros(user, 'g-seccion', ['r1'])).rejects.toMatchObject({ status: 400 });
    expect(repo.agregarMiembros).not.toHaveBeenCalled();
  });

  it('rechaza sacar gente a mano de un grupo de sección', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoSeccion);
    await expect(quitarMiembro(user, 'g-seccion', 'r1')).rejects.toMatchObject({ status: 400 });
    expect(repo.quitarMiembro).not.toHaveBeenCalled();
  });

  it('agrega y quita integrantes de un grupo personalizado', async () => {
    vi.mocked(repo.obtenerGrupo).mockResolvedValue(grupoPersonalizado);
    await agregarMiembros(user, 'g-custom', ['r1']);
    expect(repo.agregarMiembros).toHaveBeenCalledWith('g-custom', ['r1']);
    await quitarMiembro(user, 'g-custom', 'r1');
    expect(repo.quitarMiembro).toHaveBeenCalledWith('g-custom', 'r1');
  });
});
