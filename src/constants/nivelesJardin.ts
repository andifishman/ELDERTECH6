// Definición de los 60 niveles del modo "camino" de Jardín ElderTech —
// estilo mapa de caramelos: cada nivel tiene un objetivo de puntos y un
// presupuesto de movimientos, y se desbloquea al completar el anterior.
// Contenido estático (mismo criterio que comoUsarContenido.ts) — el backend
// solo duplica TOTAL_NIVELES_JARDIN para validar el rango al guardar el
// progreso; la fuente de verdad del diseño de cada nivel es este archivo.
export interface NivelJardin {
  numero: number;
  objetivoPuntos: number;
  movimientos: number;
}

export const TOTAL_NIVELES_JARDIN = 60;
export const NIVELES_POR_ZONA = 10;

// ─── Curva de dificultad ──────────────────────────────────────────────────
// Cada pieza que se limpia vale 10 puntos × el multiplicador de la cascada,
// así que un match simple de 3 vale ~30 y un movimiento "normal" ronda los
// 30-50. El objetivo se define por "puntos que hay que sacar por movimiento":
//   nivel 1  → 10 por movimiento  (cualquier jugada alcanza, tutorial en la práctica)
//   nivel 20 → ~28   · nivel 30 → ~45  · nivel 40 → ~67
//   nivel 50 → ~92   · nivel 60 → ~120 (hacen falta especiales y cascadas casi todo el tiempo)
// Cada 5 niveles hay un respiro (objetivo 12% más bajo) y cada 10 un "jefe"
// (12% más alto y 2 movimientos extra), como en los mapas de este estilo: la
// dificultad sube con altibajos, no en línea recta.
function puntosPorMovimiento(n: number): number {
  return 10 + 110 * Math.pow((n - 1) / (TOTAL_NIVELES_JARDIN - 1), 1.6);
}

function movimientosBase(n: number): number {
  if (n <= 15) return 25;
  if (n <= 30) return 24;
  if (n <= 45) return 22;
  return 20;
}

function crearNivel(numero: number): NivelJardin {
  const esJefe = numero % 10 === 0;
  const esRespiro = numero % 5 === 0 && !esJefe;
  const movimientos = movimientosBase(numero) + (esJefe ? 2 : 0);
  const factor = esJefe ? 1.12 : esRespiro ? 0.88 : 1;
  const objetivoPuntos = Math.max(100, Math.round((puntosPorMovimiento(numero) * movimientos * factor) / 10) * 10);
  return { numero, objetivoPuntos, movimientos };
}

export const NIVELES_JARDIN: NivelJardin[] = Array.from({ length: TOTAL_NIVELES_JARDIN }, (_, i) => crearNivel(i + 1));

export function obtenerNivelJardin(numero: number): NivelJardin | undefined {
  return NIVELES_JARDIN.find((n) => n.numero === numero);
}

export function esNivelJefeJardin(numero: number): boolean {
  return numero % NIVELES_POR_ZONA === 0;
}

/** Máximo de movimientos usados para 3 y para 2 estrellas (con 1 estrella alcanza con llegar al objetivo dentro del presupuesto). */
export function umbralesEstrellasJardin(movimientosPresupuesto: number): { tres: number; dos: number; uno: number } {
  return {
    tres: Math.round(movimientosPresupuesto * 0.6),
    dos: Math.round(movimientosPresupuesto * 0.8),
    uno: movimientosPresupuesto,
  };
}

/**
 * 3 estrellas si se llega al objetivo usando el 60% o menos del presupuesto
 * de movimientos, 2 estrellas con el 80% o menos, 1 estrella si se llega
 * dentro del presupuesto (sea cual sea la cantidad usada). Ej.: con 20
 * movimientos → 12 o menos = 3 ★, 16 o menos = 2 ★, hasta 20 = 1 ★.
 */
export function calcularEstrellasJardin(movimientosUsados: number, movimientosPresupuesto: number): 1 | 2 | 3 {
  const { tres, dos } = umbralesEstrellasJardin(movimientosPresupuesto);
  if (movimientosUsados <= tres) return 3;
  if (movimientosUsados <= dos) return 2;
  return 1;
}

// ─── Zonas del mapa ───────────────────────────────────────────────────────
export interface ZonaJardin {
  nombre: string;
  /** Degradado del fondo de la zona, de arriba (cielo) a abajo (suelo). */
  fondo: [string, string];
  /** Color del camino (borde, relleno y tramo ya recorrido). */
  caminoBorde: string;
  caminoRelleno: string;
  /** Ícono Ionicons de la decoración de los costados. */
  decoracion: 'leaf' | 'flower' | 'rose' | 'water' | 'sunny' | 'snow';
  colorDecoracion: string;
}

export const ZONAS_JARDIN: ZonaJardin[] = [
  { nombre: 'El Jardincito', fondo: ['#BDE8FF', '#B9E39A'], caminoBorde: '#C58B4E', caminoRelleno: '#F3D9A6', decoracion: 'leaf', colorDecoracion: '#4C9F3A' },
  { nombre: 'La Huerta', fondo: ['#B9E39A', '#8FD16F'], caminoBorde: '#B07A3F', caminoRelleno: '#EFD39B', decoracion: 'flower', colorDecoracion: '#E8743B' },
  { nombre: 'El Invernadero', fondo: ['#8FD16F', '#6CC5A0'], caminoBorde: '#A0713F', caminoRelleno: '#E8D3A8', decoracion: 'rose', colorDecoracion: '#D94F7A' },
  { nombre: 'El Arroyo', fondo: ['#6CC5A0', '#7CC8E8'], caminoBorde: '#8D6E4A', caminoRelleno: '#E6D8B8', decoracion: 'water', colorDecoracion: '#2C8FC4' },
  { nombre: 'Los Campos de Lavanda', fondo: ['#B9A5E8', '#D7B8F0'], caminoBorde: '#8F6BB5', caminoRelleno: '#F0DDF8', decoracion: 'flower', colorDecoracion: '#7E57C2' },
  { nombre: 'El Gran Jardín', fondo: ['#FFD98A', '#FFB86B'], caminoBorde: '#C0762B', caminoRelleno: '#FFE9B8', decoracion: 'sunny', colorDecoracion: '#F29A1F' },
];

export function zonaDeNivel(numero: number): ZonaJardin {
  return ZONAS_JARDIN[Math.min(ZONAS_JARDIN.length - 1, Math.floor((numero - 1) / NIVELES_POR_ZONA))];
}
