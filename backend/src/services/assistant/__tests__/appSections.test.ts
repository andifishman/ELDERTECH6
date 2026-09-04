import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { esRutaValida } from '../textUtils';
import { JUEGOS_SLUGS, SECCIONES_APP } from '../appSections';

// El repo tiene `app/` (Expo Router) como hermano de `backend/` en la raíz.
// Esto compara la fuente de verdad del asistente contra los ARCHIVOS REALES
// de la app — si alguien agrega o saca una pantalla y se olvida de actualizar
// `appSections.ts`, este test lo detecta solo, en vez de que el asistente
// quede desactualizado en silencio (que es como se generó este bug la
// primera vez: la lista de rutas y la lista del prompt se armaron a mano y
// nadie las volvió a mirar cuando se agregaron Agenda, Hablemos, Juegos, etc).
const APP_DIR = join(__dirname, '../../../../../app');

/** Expo Router: una ruta puede ser `<ruta>.tsx` (archivo) o `<ruta>/index.tsx` (carpeta). */
function existeArchivoDeRuta(ruta: string): boolean {
  const relativa = ruta === '/' ? '' : ruta;
  return existsSync(join(APP_DIR, `${relativa}.tsx`)) || existsSync(join(APP_DIR, relativa, 'index.tsx'));
}

describe('SECCIONES_APP refleja pantallas reales de app/', () => {
  it.each(SECCIONES_APP.map((s) => [s.nombre, s.ruta] as const))('%s (%s) tiene un archivo real', (_nombre, ruta) => {
    expect(existeArchivoDeRuta(ruta), `No se encontró un archivo de Expo Router para "${ruta}" — ¿la sección se borró o se movió?`).toBe(true);
  });

  it('toda ruta de SECCIONES_APP pasa esRutaValida (nunca se puede desincronizar de su propia validación)', () => {
    for (const s of SECCIONES_APP) {
      expect(esRutaValida(s.ruta), s.ruta).toBe(true);
    }
  });

  it('no incluye "/profile" — no existe ninguna pantalla de perfil en la app', () => {
    expect(SECCIONES_APP.some((s) => s.ruta === '/profile')).toBe(false);
  });
});

describe('JUEGOS_SLUGS refleja los juegos reales de app/mas/juegos/', () => {
  const archivosReales = readdirSync(join(APP_DIR, 'mas/juegos'))
    .filter((f) => f.endsWith('.tsx') && f !== 'index.tsx')
    .map((f) => f.replace(/\.tsx$/, ''))
    .sort();

  it('todo juego real está en JUEGOS_SLUGS', () => {
    for (const slug of archivosReales) {
      expect(JUEGOS_SLUGS as readonly string[], `Falta agregar "${slug}" a JUEGOS_SLUGS`).toContain(slug);
    }
  });

  it('todo lo que está en JUEGOS_SLUGS existe de verdad', () => {
    for (const slug of JUEGOS_SLUGS) {
      expect(archivosReales, `JUEGOS_SLUGS tiene "${slug}" pero no existe app/mas/juegos/${slug}.tsx`).toContain(slug);
    }
  });
});
