// Parseo de los niveles del juego "Palabras" (src/constants/nivelesPalabras.ts, generado).
import { NIVELES_PALABRAS_RAW } from '@/constants/nivelesPalabras';

export const TOTAL_NIVELES_PALABRAS = NIVELES_PALABRAS_RAW.length;
/** Pistas que se ganan al completar un nivel por primera vez (el backend aplica el mismo valor). */
export const PISTAS_POR_NIVEL = 3;

export interface PalabraGrilla {
  palabra: string;
  fila: number;
  columna: number;
  horizontal: boolean;
}

export interface NivelPalabras {
  nivel: number;
  /** Letras de la rueda, en el orden inicial. */
  letras: string[];
  ancho: number;
  alto: number;
  palabras: PalabraGrilla[];
  /** Palabras válidas que no están en la grilla (cuentan como "palabra extra"). */
  extras: ReadonlySet<string>;
}

const cache = new Map<number, NivelPalabras>();

export function obtenerNivelPalabras(nivel: number): NivelPalabras | null {
  const guardado = cache.get(nivel);
  if (guardado) return guardado;

  const raw = NIVELES_PALABRAS_RAW.find((n) => n.nivel === nivel);
  if (!raw) return null;

  const parseado: NivelPalabras = {
    nivel: raw.nivel,
    letras: [...raw.letras],
    ancho: raw.ancho,
    alto: raw.alto,
    palabras: raw.palabras.map((codigo) => {
      const [palabra, fila, columna, orientacion] = codigo.split(':');
      return { palabra, fila: Number(fila), columna: Number(columna), horizontal: orientacion === 'h' };
    }),
    extras: new Set(raw.extras),
  };
  cache.set(nivel, parseado);
  return parseado;
}

/** Posiciones "fila,columna" que ocupa una palabra de la grilla. */
export function celdasDe(p: PalabraGrilla): string[] {
  return Array.from({ length: p.palabra.length }, (_, i) =>
    p.horizontal ? `${p.fila},${p.columna + i}` : `${p.fila + i},${p.columna}`,
  );
}

/** Letra que va en cada celda ocupada de la grilla, indexada por "fila,columna". */
export function letrasPorCelda(nivel: NivelPalabras): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const p of nivel.palabras) {
    celdasDe(p).forEach((clave, i) => mapa.set(clave, p.palabra[i]));
  }
  return mapa;
}
