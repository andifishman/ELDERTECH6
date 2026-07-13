/**
 * useClima.ts
 * ───────────
 * Hooks de React Query para el módulo de Clima.
 *
 * Contiene dos hooks:
 *  - useClimaCiudad(ciudad)  → obtiene el clima de una ciudad específica
 *  - useClima()              → obtiene el clima de la ciudad configurada en el backend
 *                              (con fallback a Buenos Aires del lado del backend)
 *
 * Usa React Query para cachear los resultados y evitar llamadas innecesarias a la API.
 * El clima se considera fresco por 10 minutos (staleTime).
 */

import { useQuery } from '@tanstack/react-query';
import { getClima, getClimaOrg } from '@/services/climaService';
import type { CiudadGuardada } from '@/types/clima.types';

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal: clima de la organización (ciudad natal)
// ─────────────────────────────────────────────────────────────────────────────

/** Obtiene el clima de la ciudad configurada para la organización (resuelto por el backend). */
export function useClima() {
  return useQuery({
    queryKey: ['clima', 'org'],
    queryFn: getClimaOrg,
    staleTime: 10 * 60 * 1000, // el clima cambia lento — evitar refetch en cada mount
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook secundario: clima de una ciudad guardada por el usuario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el clima de una ciudad específica guardada por el usuario.
 * Usa las coordenadas ya almacenadas en CiudadGuardada para evitar geocodificar de nuevo.
 *
 * @param ciudad  Objeto CiudadGuardada con coordenadas y zona horaria
 */
export function useClimaCiudad(ciudad: CiudadGuardada | null) {
  return useQuery({
    // La query key incluye lat/lon para que cada ciudad tenga su propio caché
    queryKey: ['clima', 'ciudad', ciudad?.lat, ciudad?.lon],
    queryFn: () => {
      if (!ciudad) throw new Error('No hay ciudad seleccionada');
      return getClima(ciudad.nombre, ciudad.lat, ciudad.lon, ciudad.timezone, ciudad.pais);
    },
    enabled: !!ciudad, // Solo ejecutar si hay una ciudad seleccionada
    staleTime: 10 * 60 * 1000, // el clima cambia lento — evitar refetch en cada mount
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
