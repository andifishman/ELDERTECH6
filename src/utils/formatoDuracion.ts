/** Segundos → "m:ss" (ej. 75 → "1:15"), para la duración de notas de voz. */
export function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
