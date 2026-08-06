import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/agenda.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const agendaRouter = Router();

agendaRouter.use(requireAuth);

// Rutas fijas antes de "/:id" para que no compitan con el parámetro dinámico.
agendaRouter.get('/today', asyncHandler(controller.getHoy));
agendaRouter.get('/week', asyncHandler(controller.getSemana));
agendaRouter.get('/month', asyncHandler(controller.getMes));
agendaRouter.get('/upcoming', asyncHandler(controller.getProximos));
agendaRouter.post('/audio', upload.single('audio'), asyncHandler(controller.postAudio));
agendaRouter.post('/importar-horario', asyncHandler(controller.postImportarHorario));

agendaRouter.get('/', asyncHandler(controller.getListar));
agendaRouter.post('/', asyncHandler(controller.postCrear));
agendaRouter.get('/:id', asyncHandler(controller.getPorId));
agendaRouter.patch('/:id', asyncHandler(controller.patchEditar));
agendaRouter.delete('/:id', asyncHandler(controller.deleteEliminar));
agendaRouter.patch('/:id/estado', asyncHandler(controller.patchEstado));
