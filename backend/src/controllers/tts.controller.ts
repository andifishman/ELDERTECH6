import type { Request, Response } from 'express';
import { z } from 'zod';
import * as ttsService from '../services/tts/TtsService';

// 600 caracteres ≈ 40 s de audio: mantiene la respuesta bajo el límite de 4.5 MB de las
// Vercel Functions. El cliente parte los textos largos en trozos.
const postTtsSchema = z.object({ texto: z.string().trim().min(1).max(600) });

export async function postTts(req: Request, res: Response): Promise<void> {
  const { texto } = postTtsSchema.parse(req.body);
  res.json({ audio: await ttsService.sintetizar(texto), formato: 'wav' });
}
