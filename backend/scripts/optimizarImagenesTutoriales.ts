// Optimiza las imágenes de tutoriales que ya estaban subidas (antes de que el
// backoffice las comprimiera al subir): las baja, las achica a 1280px de lado
// largo, las pasa a WebP y actualiza la URL en la base. El archivo original NO
// se borra del bucket — queda como respaldo por si hace falta volver atrás.
//
// Uso (desde backend/, con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env):
//   npm run optimizar:imagenes            → simulacro, solo muestra qué haría
//   npm run optimizar:imagenes -- --apply → optimiza y actualiza la base
import sharp from 'sharp';
import { getSupabaseAdmin } from '../src/repositories/supabaseAdmin';

const BUCKET = 'tutorial-images';
const LADO_MAX = 1280;
const CALIDAD = 82;
const MARCA_BUCKET = `/storage/v1/object/public/${BUCKET}/`;
const aplicar = process.argv.includes('--apply');

interface Fila {
  tabla: 'pasos_tutorial' | 'tutoriales';
  columna: 'imagen_url' | 'thumbnail_url';
  id: string;
  url: string;
}

async function cargarFilas(): Promise<Fila[]> {
  const db = getSupabaseAdmin();
  const [pasos, tutoriales] = await Promise.all([
    db.from('pasos_tutorial').select('id, imagen_url').not('imagen_url', 'is', null),
    db.from('tutoriales').select('id, thumbnail_url').not('thumbnail_url', 'is', null),
  ]);
  if (pasos.error) throw new Error(pasos.error.message);
  if (tutoriales.error) throw new Error(tutoriales.error.message);
  return [
    ...(pasos.data ?? []).map((p) => ({ tabla: 'pasos_tutorial' as const, columna: 'imagen_url' as const, id: p.id as string, url: p.imagen_url as string })),
    ...(tutoriales.data ?? []).map((t) => ({ tabla: 'tutoriales' as const, columna: 'thumbnail_url' as const, id: t.id as string, url: t.thumbnail_url as string })),
  ];
}

async function optimizar(fila: Fila): Promise<string> {
  const idx = fila.url.indexOf(MARCA_BUCKET);
  if (idx === -1) return 'omitida (no está en el bucket tutorial-images)';
  if (fila.url.endsWith('.webp')) return 'omitida (ya es WebP, se asume optimizada)';

  const rutaOriginal = decodeURIComponent(fila.url.slice(idx + MARCA_BUCKET.length).split('?')[0]);
  const respuesta = await fetch(fila.url);
  if (!respuesta.ok) return `error al descargar (${respuesta.status})`;
  const original = Buffer.from(await respuesta.arrayBuffer());

  const webp = await sharp(original)
    .rotate() // respeta la orientación EXIF de las fotos de celular
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toBuffer();

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  if (webp.length >= original.length) return `omitida (${kb(original.length)} → ${kb(webp.length)}, no mejora)`;
  if (!aplicar) return `se achicaría ${kb(original.length)} → ${kb(webp.length)}`;

  const rutaNueva = `${rutaOriginal.replace(/\.[^./]+$/, '')}-opt.webp`;
  const db = getSupabaseAdmin();
  const { error: errSubida } = await db.storage
    .from(BUCKET)
    .upload(rutaNueva, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
  if (errSubida) return `error al subir: ${errSubida.message}`;

  const { data } = db.storage.from(BUCKET).getPublicUrl(rutaNueva);
  const { error: errUpdate } = await db.from(fila.tabla).update({ [fila.columna]: data.publicUrl }).eq('id', fila.id);
  if (errUpdate) return `error al actualizar la base: ${errUpdate.message}`;
  return `optimizada ${kb(original.length)} → ${kb(webp.length)}`;
}

async function main(): Promise<void> {
  const filas = await cargarFilas();
  console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO (agregá --apply para aplicar)'} — ${filas.length} imágenes en la base\n`);
  for (const fila of filas) {
    try {
      console.log(`${fila.tabla}/${fila.id}: ${await optimizar(fila)}`);
    } catch (err) {
      console.log(`${fila.tabla}/${fila.id}: error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
