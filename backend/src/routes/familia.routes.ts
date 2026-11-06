import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import * as controller from '../controllers/familia.controller';
import * as admin from '../controllers/familiaAdmin.controller';
import * as acceso from '../controllers/familiaAcceso.controller';
import { getCacheStore } from '../cache';
import { requireAdmin, requireAuth } from '../middlewares/auth';
import { HttpError } from '../middlewares/errorHandler';
import { requireFamiliar } from '../middlewares/familia';
import { requirePermission } from '../middlewares/permissions';
import { rateLimit } from '../middlewares/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';

const MB = 1024 * 1024;
const subir = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * MB, files: 20 } });

/** Convierte los errores de multer (archivo demasiado grande, campo inesperado) en respuestas 4xx claras en vez de un 500. */
function conSubida(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err?: unknown) => {
      if (err instanceof multer.MulterError) {
        const mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera los 10 MB.' : err.code === 'LIMIT_FILE_COUNT' ? 'Son demasiados archivos a la vez (máximo 20).' : 'No se pudo leer el archivo.';
        next(new HttpError(err.code === 'LIMIT_FILE_SIZE' ? StatusCodes.REQUEST_TOO_LONG : StatusCodes.BAD_REQUEST, mensaje));
        return;
      }
      next(err);
    });
  };
}

const escribir = rateLimit({ limit: 30, windowSeconds: 60 });

/**
 * Límite por IP para los endpoints PÚBLICOS (todavía no hay usuario). En Vercel el backend va detrás de un proxy, así que la IP
 * real es la primera de x-forwarded-for; sin ella todos compartirían un mismo contador.
 */
function limitePorIp(limit: number, windowSeconds: number): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reenviada = req.headers['x-forwarded-for'];
      const ip = (typeof reenviada === 'string' ? reenviada.split(',')[0]?.trim() : undefined) || req.ip || 'anon';
      const cuenta = await getCacheStore().increment(`ratelimit:acceso:${req.path}:${ip}`, windowSeconds);
      if (cuenta > limit) {
        res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ═══ Público: entrada a la app de familiares (/api/acceso-familia) ═══════════
export const familiaAccesoRouter = Router();
familiaAccesoRouter.post('/verificar', limitePorIp(20, 600), asyncHandler(acceso.postVerificar));
familiaAccesoRouter.post('/solicitar', limitePorIp(5, 3600), asyncHandler(acceso.postSolicitar));

// ═══ App de familiares: /api/familia ═════════════════════════════════════════
export const familiaRouter = Router();
familiaRouter.use(requireAuth, requireFamiliar, rateLimit({ limit: 240, windowSeconds: 60 }));

familiaRouter.get('/me', asyncHandler(controller.getMe));
familiaRouter.get('/inicio', asyncHandler(controller.getInicio));
familiaRouter.get('/residentes/:residenteId/agenda', asyncHandler(controller.getAgenda));
familiaRouter.get('/calendario', asyncHandler(controller.getCalendario));

familiaRouter.get('/avisos', asyncHandler(controller.getAvisos));
familiaRouter.post('/avisos/:id/leido', escribir, asyncHandler(controller.postConfirmarAviso));
familiaRouter.get('/noticias', asyncHandler(controller.getNoticias));
familiaRouter.get('/documentos', asyncHandler(controller.getDocumentos));

familiaRouter.get('/eventos', asyncHandler(controller.getEventos));
familiaRouter.put('/eventos/:id/inscripcion', escribir, asyncHandler(controller.postInscripcion));
familiaRouter.delete('/eventos/:id/inscripcion', escribir, asyncHandler(controller.deleteInscripcion));

familiaRouter.get('/fotos/albumes', asyncHandler(controller.getAlbumes));
familiaRouter.get('/fotos/albumes/:id', asyncHandler(controller.getAlbum));
familiaRouter.put('/fotos/:id/reaccion', escribir, asyncHandler(controller.putReaccion));
familiaRouter.get('/fotos/:id/comentarios', asyncHandler(controller.getComentarios));
familiaRouter.post('/fotos/:id/comentarios', escribir, asyncHandler(controller.postComentario));
familiaRouter.delete('/comentarios/:id', escribir, asyncHandler(controller.deleteComentario));

familiaRouter.get('/mensajes', asyncHandler(controller.getHilos));
familiaRouter.get('/mensajes/:residenteId', asyncHandler(controller.getMensajes));
familiaRouter.post('/mensajes/:residenteId', escribir, conSubida(subir.single('imagen')), asyncHandler(controller.postMensaje));

familiaRouter.get('/categorias', asyncHandler(controller.getCategorias));
familiaRouter.get('/casos', asyncHandler(controller.getCasos));
familiaRouter.post('/casos', escribir, asyncHandler(controller.postCaso));
familiaRouter.get('/casos/:id', asyncHandler(controller.getCaso));
familiaRouter.post('/casos/:id/respuestas', escribir, asyncHandler(controller.postRespuestaCaso));

familiaRouter.get('/propuestas', asyncHandler(controller.getPropuestas));
familiaRouter.post('/propuestas', escribir, asyncHandler(controller.postPropuesta));

// ═══ App de residentes: /api/mi-familia ══════════════════════════════════════
export const miFamiliaRouter = Router();
miFamiliaRouter.use(requireAuth);

miFamiliaRouter.get('/conversaciones', asyncHandler(controller.getHilosResidente));
miFamiliaRouter.get('/conversaciones/:vinculoId/mensajes', asyncHandler(controller.getMensajesResidente));
miFamiliaRouter.post('/conversaciones/:vinculoId/mensajes', escribir, asyncHandler(controller.postMensajeResidente));

// ═══ Backoffice: /api/admin/familia ══════════════════════════════════════════
export const familiaAdminRouter = Router();
familiaAdminRouter.use(requireAuth, requireAdmin);

// Módulo "familiares": quién es familiar de quién
familiaAdminRouter.get('/familiares', requirePermission('familiares', 'ver'), asyncHandler(admin.getFamiliares));
familiaAdminRouter.post('/familiares', requirePermission('familiares', 'crear'), asyncHandler(admin.postFamiliar));
familiaAdminRouter.get('/residentes/:residenteId/familiares', requirePermission('familiares', 'ver'), asyncHandler(admin.getFamiliaresDeResidente));
familiaAdminRouter.patch('/familiares/:id', requirePermission('familiares', 'editar'), asyncHandler(admin.patchFamiliar));
familiaAdminRouter.post('/familiares/:id/reinvitar', requirePermission('familiares', 'editar'), asyncHandler(admin.postReinvitar));
familiaAdminRouter.post('/familiares/:id/vinculos', requirePermission('familiares', 'crear'), asyncHandler(admin.postVinculo));
familiaAdminRouter.patch('/vinculos/:id', requirePermission('familiares', 'editar'), asyncHandler(admin.patchVinculo));
familiaAdminRouter.post('/vinculos/:id/revocar', requirePermission('familiares', 'editar'), asyncHandler(admin.postRevocarVinculo));
familiaAdminRouter.post('/vinculos/:id/reactivar', requirePermission('familiares', 'editar'), asyncHandler(admin.postReactivarVinculo));

// Pedidos de acceso: quien intentó entrar sin estar dado de alta (se aprueban como un alta nueva)
familiaAdminRouter.get('/solicitudes', requirePermission('familiares', 'ver'), asyncHandler(acceso.getSolicitudes));
familiaAdminRouter.post('/solicitudes/:id/aprobar', requirePermission('familiares', 'crear'), asyncHandler(acceso.postAprobar));
familiaAdminRouter.post('/solicitudes/:id/rechazar', requirePermission('familiares', 'editar'), asyncHandler(acceso.postRechazar));

// Módulo "familia_contenido": avisos, eventos, documentos, fotos
const contenido = (...acciones: Array<'ver' | 'crear' | 'editar' | 'eliminar'>) => requirePermission('familia_contenido', ...acciones);

familiaAdminRouter.get('/avisos', contenido('ver'), asyncHandler(admin.getAvisos));
familiaAdminRouter.post('/avisos', contenido('crear'), asyncHandler(admin.postAviso));
familiaAdminRouter.get('/avisos/:id/lecturas', contenido('ver'), asyncHandler(admin.getLecturasAviso));
familiaAdminRouter.patch('/avisos/:id', contenido('editar'), asyncHandler(admin.patchAviso));
familiaAdminRouter.delete('/avisos/:id', contenido('eliminar'), asyncHandler(admin.deleteAviso));

familiaAdminRouter.get('/eventos', contenido('ver'), asyncHandler(admin.getEventos));
familiaAdminRouter.post('/eventos', contenido('crear'), asyncHandler(admin.postEvento));
familiaAdminRouter.get('/eventos/:id/inscripciones', contenido('ver'), asyncHandler(admin.getInscripciones));
familiaAdminRouter.patch('/eventos/:id', contenido('editar'), asyncHandler(admin.patchEvento));
familiaAdminRouter.delete('/eventos/:id', contenido('eliminar'), asyncHandler(admin.deleteEvento));

familiaAdminRouter.get('/documentos', contenido('ver'), asyncHandler(admin.getDocumentos));
familiaAdminRouter.post('/documentos', contenido('crear'), conSubida(subir.single('archivo')), asyncHandler(admin.postDocumento));
familiaAdminRouter.delete('/documentos/:id', contenido('eliminar'), asyncHandler(admin.deleteDocumento));

familiaAdminRouter.get('/albumes', contenido('ver'), asyncHandler(admin.getAlbumes));
familiaAdminRouter.post('/albumes', contenido('crear'), asyncHandler(admin.postAlbum));
familiaAdminRouter.get('/albumes/:id', contenido('ver'), asyncHandler(admin.getAlbum));
familiaAdminRouter.patch('/albumes/:id', contenido('editar'), asyncHandler(admin.patchAlbum));
familiaAdminRouter.delete('/albumes/:id', contenido('eliminar'), asyncHandler(admin.deleteAlbum));
familiaAdminRouter.post('/albumes/:id/fotos', contenido('crear', 'editar'), conSubida(subir.array('fotos', 20)), asyncHandler(admin.postFotos));
familiaAdminRouter.delete('/fotos/:id', contenido('eliminar'), asyncHandler(admin.deleteFoto));
familiaAdminRouter.delete('/comentarios/:id', contenido('eliminar'), asyncHandler(admin.deleteComentario));

// Módulo "familia_comunicacion": consultas, reclamos, propuestas
const comunicacion = (...acciones: Array<'ver' | 'crear' | 'editar' | 'eliminar'>) => requirePermission('familia_comunicacion', ...acciones);

familiaAdminRouter.get('/casos', comunicacion('ver'), asyncHandler(admin.getCasos));
familiaAdminRouter.get('/casos/:id', comunicacion('ver'), asyncHandler(admin.getCaso));
familiaAdminRouter.post('/casos/:id/respuestas', comunicacion('editar'), asyncHandler(admin.postRespuestaCaso));
familiaAdminRouter.patch('/casos/:id/estado', comunicacion('editar'), asyncHandler(admin.patchEstadoCaso));

familiaAdminRouter.get('/categorias', comunicacion('ver'), asyncHandler(admin.getCategorias));
familiaAdminRouter.post('/categorias', comunicacion('crear'), asyncHandler(admin.postCategoria));
familiaAdminRouter.patch('/categorias/:id', comunicacion('editar'), asyncHandler(admin.patchCategoria));

familiaAdminRouter.get('/propuestas', comunicacion('ver'), asyncHandler(admin.getPropuestas));
familiaAdminRouter.patch('/propuestas/:id', comunicacion('editar'), asyncHandler(admin.patchPropuesta));
