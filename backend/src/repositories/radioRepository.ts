import { getSupabaseAdmin } from './supabaseAdmin';
import type { CategoriaRadio, PaisRadio, RadioStation } from '../providers/radio/RadioTypes';

const PAIS_LABELS: Record<string, string> = {
  AR: 'Argentina', IL: 'Israel', US: 'Estados Unidos', ES: 'España',
  MX: 'México', UY: 'Uruguay', CL: 'Chile', BR: 'Brasil',
};
const PAIS_FLAGS: Record<string, string> = {
  AR: '🇦🇷', IL: '🇮🇱', US: '🇺🇸', ES: '🇪🇸', MX: '🇲🇽', UY: '🇺🇾', CL: '🇨🇱', BR: '🇧🇷',
};
const IDIOMA_LABELS: Record<string, string> = {
  AR: 'Español', IL: 'Hebreo', US: 'Inglés', GB: 'Inglés', ES: 'Español', UY: 'Español', MX: 'Español',
};

interface RawRadioRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  url_stream: string | null;
  url_fallback: string | null;
  url_logo: string | null;
  pais: string | null;
  ciudad: string | null;
  genero: string | null;
  es_destacada: boolean;
  categoria?: { id: string; nombre: string; emoji: string | null } | null;
  pais_data?: { codigo: string; nombre: string; emoji_bandera: string | null } | null;
}

/** Porteo de `getRadioData()` (src/services/radioService.ts) — sin los URL_OVERRIDES, eso lo aplica el provider. */
export async function fetchRadioCatalog(): Promise<{ radios: RadioStation[]; categorias: CategoriaRadio[]; paises: PaisRadio[] }> {
  const supabase = getSupabaseAdmin();

  const [radiosRes, categoriasRes, paisesRes] = await Promise.all([
    supabase
      .from('radios')
      .select('*, categoria:categorias_radio(id, nombre, emoji), pais_data:paises_radio(codigo, nombre, emoji_bandera)')
      .eq('activo', true)
      .order('es_destacada', { ascending: false })
      .order('nombre', { ascending: true }),
    supabase.from('categorias_radio').select('id, nombre, emoji, orden').eq('activo', true).order('orden'),
    supabase.from('paises_radio').select('id, codigo, nombre, emoji_bandera, orden').eq('activo', true).order('orden'),
  ]);

  if (radiosRes.error) throw new Error(`Error al cargar radios: ${radiosRes.error.message}`);
  if (categoriasRes.error) throw new Error(`Error al cargar categorías: ${categoriasRes.error.message}`);
  if (paisesRes.error) throw new Error(`Error al cargar países: ${paisesRes.error.message}`);

  const radios: RadioStation[] = ((radiosRes.data ?? []) as unknown as RawRadioRow[]).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    urlStream: r.url_stream ?? '',
    urlFallback: r.url_fallback ?? null,
    urlLogo: r.url_logo,
    pais: r.pais ?? 'AR',
    paisNombre: r.pais_data?.nombre ?? PAIS_LABELS[r.pais ?? 'AR'] ?? r.pais ?? null,
    paisEmoji: r.pais_data?.emoji_bandera ?? PAIS_FLAGS[r.pais ?? 'AR'] ?? null,
    ciudad: r.ciudad,
    genero: r.genero,
    esDestacada: r.es_destacada,
    categoriaId: r.categoria?.id ?? null,
    categoria: r.categoria?.nombre ?? null,
    categoriaEmoji: r.categoria?.emoji ?? null,
  }));

  const categorias: CategoriaRadio[] = ((categoriasRes.data ?? []) as Array<{ id: string; nombre: string; emoji: string | null; orden: number }>).map(
    (c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji, orden: c.orden }),
  );

  const paisesConRadios = new Set(radios.map((r) => r.pais));
  const paises: PaisRadio[] = ((paisesRes.data ?? []) as Array<{ id: string; codigo: string; nombre: string; emoji_bandera: string | null; orden: number }>)
    .filter((p) => paisesConRadios.has(p.codigo))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: IDIOMA_LABELS[p.codigo] ?? p.nombre,
      emojiBandera: p.emoji_bandera,
      orden: p.orden,
    }));

  return { radios, categorias, paises };
}
