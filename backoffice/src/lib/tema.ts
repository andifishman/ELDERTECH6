// ========================================
// LIB: Tema por institución
// DESCRIPCIÓN:
// Pone el color principal de la institución en todo el backoffice. Tailwind lee la escala `primary-50…900` y los tokens
// `--primary` / `--ring` de variables CSS: acá se calculan a partir de UN solo color. Con `null` vuelve al violeta ElderTech.
// Hay copias de las funciones de color en `familia/src/lib/tema.ts` y `backend/src/utils/color.ts`.
// ========================================

const HEX = /^#[0-9A-Fa-f]{6}$/;
export const esColorHex = (v: string): boolean => HEX.test(v);

type Rgb = [number, number, number];
const aRgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mezclar = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as Rgb;
const BLANCO: Rgb = [255, 255, 255];
const NEGRO: Rgb = [0, 0, 0];

/** Escala 50…900 a partir del color base (que es el 600, el de los botones y la barra lateral). */
export function escala(hex: string): Record<number, Rgb> {
  const base = aRgb(hex);
  return {
    50: mezclar(base, BLANCO, 0.93),
    100: mezclar(base, BLANCO, 0.85),
    200: mezclar(base, BLANCO, 0.7),
    300: mezclar(base, BLANCO, 0.52),
    400: mezclar(base, BLANCO, 0.3),
    500: mezclar(base, BLANCO, 0.12),
    600: base,
    700: mezclar(base, NEGRO, 0.18),
    800: mezclar(base, NEGRO, 0.34),
    900: mezclar(base, NEGRO, 0.52),
  };
}

function aHsl([r, g, b]: Rgb): string {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
    h = Math.round(h * 60 + (h < 0 ? 360 : 0));
  }
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Luminancia WCAG y contraste contra texto blanco: se usa para avisar antes de guardar un color muy claro. */
export function contrasteConBlanco(hex: string): number {
  const l = aRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 1.05 / (0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] + 0.05);
}
export const CONTRASTE_MINIMO = 4.5;

const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
let colorActual: string | null = null;

function pintar(): void {
  const raiz = document.documentElement;
  if (!colorActual) {
    TONOS.forEach((t) => raiz.style.removeProperty(`--primary-${t}`));
    raiz.style.removeProperty('--primary');
    raiz.style.removeProperty('--ring');
    return;
  }
  const e = escala(colorActual);
  TONOS.forEach((t) => raiz.style.setProperty(`--primary-${t}`, e[t]!.join(' ')));
  // En modo oscuro los botones usan un tono claro (como el violeta original), no el color de marca puro.
  const principal = aHsl(raiz.classList.contains('dark') ? e[300]! : e[600]!);
  raiz.style.setProperty('--primary', principal);
  raiz.style.setProperty('--ring', principal);
}

/** Aplica el color principal de la institución (o vuelve al violeta ElderTech con null). */
export function aplicarColorPrincipal(hex: string | null | undefined): void {
  colorActual = hex && esColorHex(hex) ? hex : null;
  pintar();
}

// Si el usuario alterna modo claro/oscuro, se recalcula el tono de los botones.
if (typeof MutationObserver !== 'undefined') {
  new MutationObserver(pintar).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
