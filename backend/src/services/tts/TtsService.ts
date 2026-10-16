import { createHash } from 'node:crypto';
import { StatusCodes } from 'http-status-codes';
import { env } from '../../config/env';
import { getCacheStore } from '../../cache';
import { HttpError } from '../../middlewares/errorHandler';
import { logger } from '../../logging/logger';

// Texto a voz generado en el servidor. Existe porque el motor de voz del propio
// celular/navegador no es confiable: hay Chrome en Android (sobre todo con Samsung TTS)
// que reporta 0 voces y deja `speechSynthesis.speak()` en cola para siempre, en silencio.
// El audio generado acá se reproduce como un <audio> común y anda en cualquier equipo.
const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_CACHEABLE_BASE64 = 700_000; // el REST de Upstash limita el tamaño del valor
const SAMPLE_RATE = 24000; // Gemini TTS devuelve PCM 16-bit mono a 24 kHz

interface GeminiTtsResponse {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
}

/** Envuelve PCM crudo en un contenedor WAV para que cualquier <audio> lo reproduzca. */
function pcmAWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function pedirAGemini(texto: string): Promise<Buffer> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new HttpError(StatusCodes.SERVICE_UNAVAILABLE, 'La voz del servidor no está configurada');

  const res = await fetch(`${GEMINI_TTS_URL}/${env.geminiTtsModel}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Decí con voz clara, cálida y pausada, en español rioplatense: ${texto}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.geminiTtsVoice } } },
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    logger.warn('Gemini TTS falló', { status: res.status, detalle });
    const status = res.status === 429 ? StatusCodes.TOO_MANY_REQUESTS : StatusCodes.BAD_GATEWAY;
    throw new HttpError(status, 'No se pudo generar la voz en este momento');
  }

  const data = (await res.json()) as GeminiTtsResponse;
  const base64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!base64) throw new HttpError(StatusCodes.BAD_GATEWAY, 'La voz del servidor no devolvió audio');
  return Buffer.from(base64, 'base64');
}

/** Devuelve el WAV (base64) del texto. Los textos repetidos (menús, tarjetas) salen de cache. */
export async function sintetizar(texto: string): Promise<string> {
  const cache = getCacheStore();
  const clave = `tts:v1:${env.geminiTtsVoice}:${createHash('sha1').update(texto).digest('hex')}`;

  const guardado = await cache.get<string>(clave).catch(() => null);
  if (guardado) return guardado;

  let pcm: Buffer;
  try {
    pcm = await pedirAGemini(texto);
  } catch (err) {
    // Gemini TTS (preview) a veces responde sin audio la primera vez: un reintento lo resuelve.
    if (err instanceof HttpError && err.status === StatusCodes.BAD_GATEWAY) pcm = await pedirAGemini(texto);
    else throw err;
  }

  const wavBase64 = pcmAWav(pcm).toString('base64');
  if (wavBase64.length <= MAX_CACHEABLE_BASE64) {
    await cache.set(clave, wavBase64, CACHE_TTL_SECONDS).catch(() => undefined);
  }
  return wavBase64;
}
