import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/familiaComunicacionRepository', () => ({
  obtenerCaso: vi.fn(),
  obtenerCategoria: vi.fn(),
  crearCaso: vi.fn(),
  crearMensajeCaso: vi.fn(),
  cambiarEstadoCaso: vi.fn(),
  listarMensajesCaso: vi.fn(),
  listarMensajes: vi.fn(),
  marcarLeidos: vi.fn(),
  crearMensaje: vi.fn(),
  listarVinculosDeResidente: vi.fn(),
  resumirHilos: vi.fn(),
}));
vi.mock('../../repositories/familiaStorage', () => ({
  BUCKETS_FAMILIA: { mensajes: 'familia-mensajes', fotos: 'familia-fotos', documentos: 'familia-documentos' },
  firmarVarias: vi.fn(async () => new Map()),
  subir: vi.fn(),
  borrar: vi.fn(),
  detectarTipo: vi.fn(),
}));
vi.mock('../audit/AuditService', () => ({ registrarAuditoria: vi.fn() }));
vi.mock('../../logging/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('./FamiliaContenidoService', () => ({ validarImagen: vi.fn() }));

import * as repo from '../../repositories/familiaComunicacionRepository';
import {
  crearCaso,
  enviarMensajeFamiliar,
  mensajesDelFamiliar,
  mensajesDelResidente,
  obtenerCaso,
  obtenerCasoAdmin,
  responderCasoFamiliar,
  responderResidente,
} from './FamiliaComunicacionService';
import type { AuthUser } from '../../middlewares/auth';
import type { FamiliarContext } from '../../utils/familia';

const ctx: FamiliarContext = {
  familiarId: 'fam-1',
  organizacionId: 'org-1',
  nombre: 'Ana',
  apellido: 'P',
  email: 'a@b.com',
  vinculos: [{ vinculoId: 'v1', residenteId: 'res-1', parentesco: null, nombre: 'Rosa', apellido: 'G', seccion: null }],
};

const caso = (parcial: Partial<repo.CasoConDatos> = {}): repo.CasoConDatos => ({
  id: 'c1', organizacion_id: 'org-1', familiar_id: 'fam-1', residente_id: null, tipo: 'consulta', categoria_id: null, asunto: 'Visitas', descripcion: 'Hola', estado: 'pendiente',
  resuelto_en: null, created_at: '', updated_at: '', categoria_nombre: null, residente_nombre: null, familiar_nombre: null, cantidad_respuestas: 0, ...parcial,
});

beforeEach(() => vi.clearAllMocks());

describe('consultas: aislamiento entre familias e instituciones', () => {
  it('una familia ve su propia consulta', async () => {
    vi.mocked(repo.obtenerCaso).mockResolvedValue(caso());
    vi.mocked(repo.listarMensajesCaso).mockResolvedValue([]);
    expect((await obtenerCaso(ctx, 'c1')).caso.id).toBe('c1');
  });

  it('la consulta de OTRA familia da 404', async () => {
    vi.mocked(repo.obtenerCaso).mockResolvedValue(caso({ familiar_id: 'fam-2' }));
    await expect(obtenerCaso(ctx, 'c1')).rejects.toThrow('Consulta no encontrado');
    await expect(responderCasoFamiliar(ctx, 'c1', 'hola')).rejects.toThrow('Consulta no encontrado');
    expect(repo.crearMensajeCaso).not.toHaveBeenCalled();
  });

  it('la consulta de otra institución da 404 también para el personal', async () => {
    vi.mocked(repo.obtenerCaso).mockResolvedValue(caso({ organizacion_id: 'org-2' }));
    const staff: AuthUser = { supabaseUserId: 's', email: null, residenteId: null, organizacionId: 'org-1', rol: 'admin', activo: true, isSuperAdmin: false };
    await expect(obtenerCasoAdmin(staff, 'c1')).rejects.toThrow('Consulta no encontrado');
  });

  it('si la familia escribe sobre una consulta resuelta, se reabre', async () => {
    vi.mocked(repo.obtenerCaso).mockResolvedValue(caso({ estado: 'resuelta' }));
    await responderCasoFamiliar(ctx, 'c1', 'Sigo con la duda');
    expect(repo.cambiarEstadoCaso).toHaveBeenCalledWith('c1', 'pendiente', 'fam-1');
  });

  it('no deja crear una consulta sobre un residente ajeno', async () => {
    await expect(crearCaso(ctx, { tipo: 'sugerencia', residenteId: 'res-ajeno', asunto: 'x', descripcion: 'y' })).rejects.toThrow('No encontramos a ese residente');
    expect(repo.crearCaso).not.toHaveBeenCalled();
  });

  it('no deja usar una categoría de otra institución o desactivada', async () => {
    vi.mocked(repo.obtenerCategoria).mockResolvedValue(null);
    await expect(crearCaso(ctx, { tipo: 'consulta', categoriaId: 'cat-x', asunto: 'x', descripcion: 'y' })).rejects.toThrow('categoría');
    vi.mocked(repo.obtenerCategoria).mockResolvedValue({ id: 'cat-1', nombre: 'Pedido', activa: false, orden: 1 });
    await expect(crearCaso(ctx, { tipo: 'consulta', categoriaId: 'cat-1', asunto: 'x', descripcion: 'y' })).rejects.toThrow('categoría');
    expect(repo.crearCaso).not.toHaveBeenCalled();
  });
});

describe('mensajes familiar ↔ residente', () => {
  it('el familiar no puede leer ni escribir en el hilo de un residente ajeno', async () => {
    await expect(mensajesDelFamiliar(ctx, 'res-ajeno')).rejects.toThrow('No encontramos a ese residente');
    await expect(enviarMensajeFamiliar(ctx, 'res-ajeno', 'hola', null)).rejects.toThrow('No encontramos a ese residente');
    expect(repo.listarMensajes).not.toHaveBeenCalled();
    expect(repo.crearMensaje).not.toHaveBeenCalled();
  });

  it('leer el hilo marca como leídos los mensajes del residente', async () => {
    vi.mocked(repo.listarMensajes).mockResolvedValue([]);
    await mensajesDelFamiliar(ctx, 'res-1');
    expect(repo.listarMensajes).toHaveBeenCalledWith('v1');
    expect(repo.marcarLeidos).toHaveBeenCalledWith('v1', 'familiar');
  });

  it('un mensaje vacío y sin foto se rechaza', async () => {
    await expect(enviarMensajeFamiliar(ctx, 'res-1', '', null)).rejects.toThrow('Escribí un mensaje');
  });

  const residente: AuthUser = { supabaseUserId: 'u', email: null, residenteId: 'res-1', organizacionId: 'org-1', rol: 'residente', activo: true, isSuperAdmin: false };

  it('el residente solo accede a hilos de SUS vínculos activos', async () => {
    vi.mocked(repo.listarVinculosDeResidente).mockResolvedValue([{ vinculo_id: 'v1', parentesco: null, familiar_nombre: 'Ana', familiar_apellido: 'P' }]);
    await expect(mensajesDelResidente(residente, 'v-de-otro')).rejects.toThrow('Conversación no encontrado');
    await expect(responderResidente(residente, 'v-de-otro', 'hola')).rejects.toThrow('Conversación no encontrado');
    expect(repo.crearMensaje).not.toHaveBeenCalled();
    vi.mocked(repo.crearMensaje).mockResolvedValue({ id: 'm1', vinculo_id: 'v1', autor: 'residente', contenido: 'Hola hija', imagen_path: null, leido_en: null, created_at: '' });
    await responderResidente(residente, 'v1', 'Hola hija');
    expect(repo.crearMensaje).toHaveBeenCalledWith('v1', 'residente', 'Hola hija', null);
  });

  it('un usuario sin residente asociado no entra a Mi familia', async () => {
    await expect(mensajesDelResidente({ ...residente, residenteId: null }, 'v1')).rejects.toThrow('residente asociado');
  });
});
