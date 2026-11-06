import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Buckets PRIVADOS de la app de familiares. En la base se guarda la RUTA (nunca una
 * URL) y cada vez que un dato sale hacia un cliente se canjea por una URL firmada de
 * corta duración — a diferencia de `storageUrls.ts` (7 días, pensado para la caché de
 * la app de residentes), acá la URL vive 1 hora.
 */
export const BUCKETS_FAMILIA = {
  mensajes: 'familia-mensajes',
  fotos: 'familia-fotos',
  documentos: 'familia-documentos',
} as const;
export type BucketFamilia = (typeof BUCKETS_FAMILIA)[keyof typeof BUCKETS_FAMILIA];

export const SEGUNDOS_URL_FAMILIA = 60 * 60;

export type TipoArchivo = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

const EXTENSION: Record<TipoArchivo, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Detecta el tipo REAL mirando los primeros bytes. El `mimetype` que manda el cliente se
 * puede falsear (un .html renombrado a .jpg), así que nunca se usa para decidir qué se guarda.
 */
export function detectarTipo(buffer: Buffer): TipoArchivo | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}

/** Sube el archivo y devuelve la ruta. No usa `withRepoLogging` a propósito: loguearía el Buffer entero. */
export async function subir(bucket: BucketFamilia, organizacionId: string, buffer: Buffer, tipo: TipoArchivo): Promise<string> {
  const path = `${organizacionId}/${randomUUID()}.${EXTENSION[tipo]}`;
  const { error } = await getSupabaseAdmin().storage.from(bucket).upload(path, buffer, { contentType: tipo, upsert: false });
  if (error) throw new Error(`Error al subir el archivo: ${error.message}`);
  return path;
}

export async function firmar(bucket: BucketFamilia, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUrl(path, SEGUNDOS_URL_FAMILIA);
  return error || !data ? null : data.signedUrl;
}

/** Firma varias rutas de una; las que no se pueden firmar quedan en null. */
export async function firmarVarias(bucket: BucketFamilia, paths: string[]): Promise<Map<string, string | null>> {
  const resultado = new Map<string, string | null>();
  if (paths.length === 0) return resultado;
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUrls(paths, SEGUNDOS_URL_FAMILIA);
  if (error || !data) {
    paths.forEach((p) => resultado.set(p, null));
    return resultado;
  }
  for (const item of data) if (item.path) resultado.set(item.path, item.error ? null : item.signedUrl);
  return resultado;
}

export async function borrar(bucket: BucketFamilia, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove(paths);
  if (error) throw new Error(`Error al borrar los archivos: ${error.message}`);
}
