import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/novedadesRepository', () => ({
  listarParaAdmin: vi.fn(),
  obtener: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  vincularNotificacion: vi.fn(),
  eliminar: vi.fn(),
  listarParaResidente: vi.fn(),
  marcarLeida: vi.fn(),
  subirImagen: vi.fn(),
}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('../notifications/NotificationsAdminService', () => ({ crear: vi.fn() }));

import * as repo from '../../repositories/novedadesRepository';
import * as notificationsAdminService from '../notifications/NotificationsAdminService';
import { marcarLeida, publicar } from './NovedadesService';
import type { AuthUser } from '../../middlewares/auth';
import type { Notification } from '../../providers/notifications/NotificationTypes';

const staff: AuthUser = {
  supabaseUserId: 'staff-1',
  email: 'staff@eldertech.com',
  residenteId: null,
  organizacionId: 'org-1',
  rol: 'admin',
  activo: true,
  isSuperAdmin: false,
};

const residente: AuthUser = { ...staff, supabaseUserId: 'user-r1', residenteId: 'res-1', rol: 'residente' };

const novedad: repo.Novedad = {
  id: 'nov-1', organizacion_id: 'org-1', titulo: 'Fiesta de la primavera', texto: 'El sábado festejamos en el salón.',
  imagen_url: null, grupo_ids: null, visible_hasta: '', notificacion_id: null, creado_por: 'staff-1', created_at: '', updated_at: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.crear).mockResolvedValue(novedad);
});

describe('publicar', () => {
  it('sin grupos la publica para todos y la deja visible un mes', async () => {
    const antes = new Date();
    await publicar(staff, { titulo: novedad.titulo, texto: novedad.texto, imagenUrl: null, grupoIds: [], notificar: false });

    const input = vi.mocked(repo.crear).mock.calls[0]![2];
    expect(input.grupoIds).toBeNull();
    const esperado = new Date(antes);
    esperado.setMonth(esperado.getMonth() + 1);
    expect(Math.abs(new Date(input.visibleHasta).getTime() - esperado.getTime())).toBeLessThan(5000);
    expect(notificationsAdminService.crear).not.toHaveBeenCalled();
  });

  it('con aviso manda la notificación a los mismos grupos y la vincula', async () => {
    vi.mocked(notificationsAdminService.crear).mockResolvedValue({ id: 'notif-1' } as Notification);

    const resultado = await publicar(staff, { titulo: novedad.titulo, texto: novedad.texto, imagenUrl: null, grupoIds: ['g-1'], notificar: true });

    expect(notificationsAdminService.crear).toHaveBeenCalledWith(
      staff,
      expect.objectContaining({ destino_tipo: 'grupo', destino_filtro: { grupo_ids: ['g-1'] }, pantalla_destino: 'novedades' }),
      'enviar',
    );
    expect(repo.vincularNotificacion).toHaveBeenCalledWith('nov-1', 'notif-1');
    expect(resultado.notificacion_id).toBe('notif-1');
  });

  it('si el aviso falla, la novedad queda publicada igual', async () => {
    vi.mocked(notificationsAdminService.crear).mockRejectedValue(new Error('Expo caído'));

    const resultado = await publicar(staff, { titulo: novedad.titulo, texto: novedad.texto, imagenUrl: null, grupoIds: [], notificar: true });

    expect(resultado.id).toBe('nov-1');
    expect(repo.vincularNotificacion).not.toHaveBeenCalled();
  });
});

describe('marcarLeida', () => {
  it('no deja marcar una novedad que no le corresponde al residente', async () => {
    vi.mocked(repo.listarParaResidente).mockResolvedValue([]);
    await expect(marcarLeida(residente, 'nov-de-otro-grupo')).rejects.toThrow('Novedad no encontrada');
    expect(repo.marcarLeida).not.toHaveBeenCalled();
  });

  it('marca como leída una novedad visible para el residente', async () => {
    vi.mocked(repo.listarParaResidente).mockResolvedValue([{ ...novedad, leida: false }]);
    await marcarLeida(residente, 'nov-1');
    expect(repo.marcarLeida).toHaveBeenCalledWith('nov-1', 'res-1');
  });
});
