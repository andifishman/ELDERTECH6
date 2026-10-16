import { Router } from 'express';
import * as controller from '../controllers/tts.controller';
import { requireAuth } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';

export const ttsRouter = Router();

ttsRouter.use(requireAuth);

// Cuota de Gemini compartida por toda la residencia — mismo criterio que el asistente.
ttsRouter.post('/', rateLimit({ limit: 40, windowSeconds: 60 }), asyncHandler(controller.postTts));
