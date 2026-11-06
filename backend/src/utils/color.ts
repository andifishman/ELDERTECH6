// Utilidades de color para el color principal de cada institución. Hay una copia casi idéntica en
// `backoffice/src/lib/tema.ts` y en `familia/src/lib/tema.ts` (el frontend la usa para avisar antes de guardar):
// si cambia la regla de contraste, cambiarla en los tres.

const HEX = /^#[0-9A-Fa-f]{6}$/;

export const esColorHex = (valor: string): boolean => HEX.test(valor);

function aRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Luminancia relativa (WCAG 2.x). */
function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste del color contra texto blanco (1 a 21). */
export function contrasteConBlanco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}

/** Mínimo para que el texto blanco sobre el color se lea bien (WCAG AA, texto normal). */
export const CONTRASTE_MINIMO = 4.5;
