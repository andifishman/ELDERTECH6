import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Buckets con contenido privado de los residentes (notas de voz y fotos de
 * chats privados, audios de solicitudes). No son públicos: la URL que se
 * guarda en la base es la "pública" que devolvió el upload, y se canjea por
 * una URL firmada temporal cada vez que un dato sale hacia un cliente.
 */
const BUCKETS_PRIVADOS = new Set(['hablemos-audio', 'hablemos-imagenes', 'pedidos-audio']);

/**
 * Vida de la URL firmada. Las apps guardan las listas en una caché persistida, así que una URL
 * de 1 h dejaría sin reproducir audios ya cargados; 7 días cubre esa caché y sigue siendo temporal.
 */
const SEGUNDOS_URL_FIRMADA = 7 * 24 * 60 * 60;

const URL_STORAGE = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/;

/** Devuelve una URL firmada si `url` apunta a un bucket privado; cualquier otra URL (o null) vuelve igual. */
export async function firmarUrlPrivada(url: string | null): Promise<string | null> {
  if (!url) return url;
  const [, bucket, ruta] = URL_STORAGE.exec(url) ?? [];
  if (!bucket || !ruta || !BUCKETS_PRIVADOS.has(bucket)) return url;
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUrl(decodeURIComponent(ruta), SEGUNDOS_URL_FIRMADA);
  // Si no se puede firmar se devuelve la original: en un bucket privado no abre, pero no rompe la lista entera.
  return error || !data ? url : data.signedUrl;
}
