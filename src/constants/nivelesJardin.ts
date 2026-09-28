// Definición de los 30 niveles del modo "camino" de Jardín ElderTech —
// estilo candy crush: cada nivel tiene un objetivo de puntos y un
// presupuesto de movimientos, y se desbloquea al completar el anterior.
// Contenido estático (mismo criterio que comoUsarContenido.ts) — se
// duplica en el backend (backend/src/constants/nivelesJardin.ts) solo para
// validar el rango de nivel/movimientos al guardar el progreso; la fuente
// de verdad del diseño de cada nivel es este archivo.
export interface NivelJardin {
  numero: number;
  objetivoPuntos: number;
  movimientos: number;
}

export const TOTAL_NIVELES_JARDIN = 30;

export const NIVELES_JARDIN: NivelJardin[] = [
  { numero: 1, objetivoPuntos: 150, movimientos: 18 },
  { numero: 2, objetivoPuntos: 220, movimientos: 18 },
  { numero: 3, objetivoPuntos: 300, movimientos: 18 },
  { numero: 4, objetivoPuntos: 380, movimientos: 18 },
  { numero: 5, objetivoPuntos: 480, movimientos: 20 },
  { numero: 6, objetivoPuntos: 580, movimientos: 20 },
  { numero: 7, objetivoPuntos: 680, movimientos: 20 },
  { numero: 8, objetivoPuntos: 800, movimientos: 20 },
  { numero: 9, objetivoPuntos: 920, movimientos: 20 },
  { numero: 10, objetivoPuntos: 1050, movimientos: 22 },
  { numero: 11, objetivoPuntos: 1180, movimientos: 22 },
  { numero: 12, objetivoPuntos: 1320, movimientos: 22 },
  { numero: 13, objetivoPuntos: 1460, movimientos: 22 },
  { numero: 14, objetivoPuntos: 1600, movimientos: 22 },
  { numero: 15, objetivoPuntos: 1760, movimientos: 24 },
  { numero: 16, objetivoPuntos: 1920, movimientos: 24 },
  { numero: 17, objetivoPuntos: 2080, movimientos: 24 },
  { numero: 18, objetivoPuntos: 2260, movimientos: 24 },
  { numero: 19, objetivoPuntos: 2440, movimientos: 24 },
  { numero: 20, objetivoPuntos: 2640, movimientos: 26 },
  { numero: 21, objetivoPuntos: 2840, movimientos: 26 },
  { numero: 22, objetivoPuntos: 3040, movimientos: 26 },
  { numero: 23, objetivoPuntos: 3260, movimientos: 26 },
  { numero: 24, objetivoPuntos: 3480, movimientos: 26 },
  { numero: 25, objetivoPuntos: 3720, movimientos: 28 },
  { numero: 26, objetivoPuntos: 3960, movimientos: 28 },
  { numero: 27, objetivoPuntos: 4220, movimientos: 28 },
  { numero: 28, objetivoPuntos: 4480, movimientos: 28 },
  { numero: 29, objetivoPuntos: 4760, movimientos: 28 },
  { numero: 30, objetivoPuntos: 5200, movimientos: 30 },
];

export function obtenerNivelJardin(numero: number): NivelJardin | undefined {
  return NIVELES_JARDIN.find((n) => n.numero === numero);
}

/**
 * 3 estrellas si se llega al objetivo usando el 60% o menos del presupuesto
 * de movimientos, 2 estrellas con el 80% o menos, 1 estrella si se llega
 * dentro del presupuesto (sea cual sea la cantidad usada).
 */
export function calcularEstrellasJardin(movimientosUsados: number, movimientosPresupuesto: number): 1 | 2 | 3 {
  if (movimientosUsados <= Math.round(movimientosPresupuesto * 0.6)) return 3;
  if (movimientosUsados <= Math.round(movimientosPresupuesto * 0.8)) return 2;
  return 1;
}
