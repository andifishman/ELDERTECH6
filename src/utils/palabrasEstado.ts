// Estado en memoria del juego Palabras, compartido entre el mapa de niveles y el juego.
//
// Por qué existe: antes cada acción esperaba la respuesta del servidor (pistas, completar nivel) y se
// sentía lenta. Ahora la pantalla se actualiza AL INSTANTE con lo que ya sabe, y el servidor se
// sincroniza de fondo. Para que lo de fondo no se pise, los guardados corren de a uno, en orden.
import type { ProgresoPalabras } from '@/services/juegosService';

let progreso: ProgresoPalabras | null = null;
let cola: Promise<unknown> = Promise.resolve();

export function leerProgresoPalabras(): ProgresoPalabras | null {
  return progreso;
}

export function guardarProgresoPalabras(nuevo: ProgresoPalabras): void {
  progreso = nuevo;
}

/** Cambia el saldo de pistas en memoria (cuando se usa una o se gana el premio de un nivel). */
export function ajustarPistas(delta: number): number {
  const actual = progreso?.pistas ?? 0;
  const nuevo = Math.max(0, actual + delta);
  progreso = { nivelesCompletados: progreso?.nivelesCompletados ?? [], pistas: nuevo };
  return nuevo;
}

export function marcarNivelCompletado(nivel: number): void {
  const niveles = new Set(progreso?.nivelesCompletados ?? []);
  niveles.add(nivel);
  progreso = { nivelesCompletados: [...niveles].sort((a, b) => a - b), pistas: progreso?.pistas ?? 0 };
}

/**
 * Encola una tarea de sincronización con el servidor: corren una a la vez y en orden (así "completar el nivel 4"
 * siempre llega antes que "completar el nivel 5"). Una tarea que falla no frena a las siguientes; la promesa
 * devuelta rechaza para que quien la encoló pueda avisar o reintentar.
 */
export function encolarSincronizacion<T>(tarea: () => Promise<T>): Promise<T> {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.catch(() => undefined);
  return resultado;
}
