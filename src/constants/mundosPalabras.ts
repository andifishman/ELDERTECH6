// "Mundos" del juego Palabras: cada 15 niveles cambia el paisaje (fondo degradé + color de acento),
// como los fondos de los juegos de palabras comerciales. Se usan en el mapa de niveles y en el juego.
export interface MundoPalabras {
  nombre: string;
  emoji: string;
  /** Degradé del fondo, de arriba hacia abajo. */
  colores: [string, string, string];
  /** Color de las letras elegidas, el trazo y los botones principales. */
  acento: string;
}

export const NIVELES_POR_MUNDO = 15;

export const MUNDOS_PALABRAS: MundoPalabras[] = [
  { nombre: 'Océano', emoji: '🌊', colores: ['#0B3C5D', '#1D78A8', '#4FC3D9'], acento: '#00838F' },
  { nombre: 'Atardecer', emoji: '🌅', colores: ['#4A1942', '#C2477A', '#F7A35C'], acento: '#C2185B' },
  { nombre: 'Bosque', emoji: '🌲', colores: ['#0B3D2E', '#2E7D4F', '#9CCC65'], acento: '#2E7D32' },
  { nombre: 'Aurora', emoji: '🌌', colores: ['#0F1B4C', '#4527A0', '#26C6DA'], acento: '#6A3FD8' },
  { nombre: 'Desierto', emoji: '🏜️', colores: ['#6D3B1F', '#C77D3A', '#F5CF87'], acento: '#D84315' },
  { nombre: 'Nieve', emoji: '❄️', colores: ['#2C4A6E', '#6C9BCF', '#DDEBFA'], acento: '#1565C0' },
  { nombre: 'Jardín', emoji: '🌸', colores: ['#4A148C', '#AB47BC', '#F8BBD0'], acento: '#AD1457' },
  { nombre: 'Cielo', emoji: '☁️', colores: ['#1565C0', '#42A5F5', '#E3F2FD'], acento: '#0277BD' },
  { nombre: 'Otoño', emoji: '🍂', colores: ['#3E1F1F', '#B8452E', '#F2A65A'], acento: '#BF360C' },
  { nombre: 'Noche estrellada', emoji: '✨', colores: ['#05061A', '#1A1F4D', '#3B2F7A'], acento: '#F57C00' },
];

/** Mundo al que pertenece un nivel (1-15 → 0, 16-30 → 1, …). */
export function mundoDeNivel(nivel: number): MundoPalabras {
  const indice = Math.min(Math.floor((Math.max(nivel, 1) - 1) / NIVELES_POR_MUNDO), MUNDOS_PALABRAS.length - 1);
  return MUNDOS_PALABRAS[indice];
}

export function indiceMundo(nivel: number): number {
  return Math.min(Math.floor((Math.max(nivel, 1) - 1) / NIVELES_POR_MUNDO), MUNDOS_PALABRAS.length - 1);
}
