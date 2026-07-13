import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/assistant.controller';
import { requireAuth } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const assistantRouter = Router();

assistantRouter.use(requireAuth);

assistantRouter.get('/faq', asyncHandler(controller.getFaq));

assistantRouter.post('/sessions', asyncHandler(controller.postSesion));
assistantRouter.get('/sessions', asyncHandler(controller.getSesiones));
assistantRouter.patch('/sessions/:id', asyncHandler(controller.patchSesion));

assistantRouter.get('/messages', asyncHandler(controller.getMensajes));
assistantRouter.get('/messages/favorites', asyncHandler(controller.getMensajesFavoritos));
assistantRouter.post('/messages', asyncHandler(controller.postMensaje));
assistantRouter.patch('/messages/:id/favorite', asyncHandler(controller.patchMensajeFavorito));

// Llaman a Groq — cuota compartida por toda la residencia, rate limit inbound
// más estricto que el resto del módulo.
assistantRouter.post(
  '/chat/completion',
  rateLimit({ limit: 20, windowSeconds: 60 }),
  asyncHandler(controller.postChatCompletion),
);
assistantRouter.post(
  '/titles/generate',
  rateLimit({ limit: 20, windowSeconds: 60 }),
  asyncHandler(controller.postGenerarTitulo),
);
assistantRouter.post(
  '/transcribe',
  rateLimit({ limit: 20, windowSeconds: 60 }),
  upload.single('audio'),
  asyncHandler(controller.postTranscribe),
);
