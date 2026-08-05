import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/hablemos.controller';
import { requireAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const hablemosRouter = Router();

hablemosRouter.use(requireAuth);

hablemosRouter.get('/residentes', asyncHandler(controller.getBuscarResidentes));

hablemosRouter.get('/conversaciones', asyncHandler(controller.getConversaciones));
hablemosRouter.post('/conversaciones', asyncHandler(controller.postConversacion));

hablemosRouter.get('/conversaciones/:id/mensajes', asyncHandler(controller.getMensajes));
hablemosRouter.post('/conversaciones/:id/mensajes/texto', asyncHandler(controller.postMensajeTexto));
hablemosRouter.post('/conversaciones/:id/mensajes/audio', upload.single('audio'), asyncHandler(controller.postMensajeAudio));

hablemosRouter.patch('/conversaciones/:id/recibidos', asyncHandler(controller.patchRecibidos));
hablemosRouter.patch('/conversaciones/:id/leidos', asyncHandler(controller.patchLeidos));
