// Adjunta un archivo local (grabación de voz, foto) a un FormData — en nativo y en web.
//
// En React Native el FormData acepta `{ uri, type, name }` y el runtime lee el archivo.
// En web ESO NO EXISTE: el FormData del navegador solo acepta Blob/File, así que
// hay que descargar el blob desde la URI (`blob:` o `data:`) y adjuntarlo de verdad.
// Sin esto, en web el servidor recibiría el texto "[object Object]" en vez del archivo.
import { Platform } from 'react-native';

export interface ArchivoAdjunto {
  /** Campo del multipart (ej. 'audio', 'foto'). */
  campo: string;
  uri: string;
  /** MIME a usar en nativo. En web manda el del blob real (ver `normalizarMime`). */
  tipoNativo: string;
  nombreNativo: string;
}

// Los buckets de Supabase (hablemos-audio, pedidos-audio, hablemos-imagenes)
// validan el Content-Type contra una lista exacta ('audio/webm', 'audio/mp4'…):
// "audio/webm;codecs=opus" —lo que reporta MediaRecorder en Chrome— sería rechazado.
function normalizarMime(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

const EXTENSION_POR_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export async function adjuntarArchivo(form: FormData, archivo: ArchivoAdjunto): Promise<void> {
  if (Platform.OS !== 'web') {
    form.append(archivo.campo, {
      uri: archivo.uri,
      type: archivo.tipoNativo,
      name: archivo.nombreNativo,
    } as unknown as Blob);
    return;
  }

  const respuesta = await fetch(archivo.uri);
  if (!respuesta.ok) throw new Error('No se pudo leer el archivo seleccionado.');
  const blob = await respuesta.blob();
  const mime = normalizarMime(blob.type || archivo.tipoNativo);
  const extension = EXTENSION_POR_MIME[mime] ?? archivo.nombreNativo.split('.').pop() ?? 'bin';
  const base = archivo.nombreNativo.replace(/\.[^.]+$/, '');
  // Re-envuelve el blob con el MIME ya normalizado (el original puede traer ";codecs=…").
  form.append(archivo.campo, new Blob([blob], { type: mime }), `${base}.${extension}`);
}

/** Atajo para grabaciones de voz. */
export function adjuntarAudio(form: FormData, uri: string, campo = 'audio'): Promise<void> {
  return adjuntarArchivo(form, { campo, uri, tipoNativo: 'audio/m4a', nombreNativo: 'audio.m4a' });
}

/** Atajo para fotos. */
export function adjuntarFoto(form: FormData, campo: string, uri: string, extension: 'jpg' | 'png' = 'jpg'): Promise<void> {
  return adjuntarArchivo(form, {
    campo,
    uri,
    tipoNativo: extension === 'png' ? 'image/png' : 'image/jpeg',
    nombreNativo: `foto.${extension}`,
  });
}
