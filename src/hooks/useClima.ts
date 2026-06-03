/**
 * useClima.ts
 * ───────────
 * Hooks de React Query para el módulo de Clima.
 *
 * Contiene dos hooks:
 *  - useClimaCiudad(ciudad)  → obtiene el clima de una ciudad específica
 *  - useClimaOrg()           → obtiene el clima de la ciudad configurada en Supabase
 *                              (con fallback a Buenos Aires si no hay config)
 *
 * Usa React Query para cachear los resultados y evitar llamadas innecesarias a la API.
 * El clima se considera fresco por 30 minutos (staleTime).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase, ORG_ID } from '@/services/supabase';
import { geocodificarCiudad, getClima } from '@/services/climaService';
import type { CiudadGuardada } from '@/types/clima.types';
import type { ConfiguracionClima } from '@/types/database.types';

// ─────────────────────────────────────────────────────────────────────────────
// Función interna: obtiene el clima de la organización desde Supabase
// ─────────────────────────────────────────────────────────────────────────────

async function fetchClimaOrg() {
  //consulta la configuración de ciudad guardada para esta organización
  const { data, error } = await supabase
    .from('configuracion_clima')
    .select('*')
    .eq('organizacion_id', ORG_ID)
    .eq('activo', true)
    .single();

  let ciudad: string;
  let lat: number;
  let lon: number;
  let pais: string = 'AR';

  if (error || !data) {
    // Fallback: si no hay configuración en Supabase, usar Buenos Aires
    ciudad = 'Buenos Aires';
    lat = -34.6037;
    lon = -58.3816;
  } else {
    const config = data as ConfiguracionClima;
    ciudad = config.ciudad;

    if (config.latitud && config.longitud) {
      // Usar coordenadas guardadas directamente (más rápido)
      lat = Number(config.latitud);
      lon = Number(config.longitud);
    } else {
      // Si no hay coordenadas, geocodificar la ciudad por nombre
      const geo = await geocodificarCiudad(ciudad);
      lat = geo.latitude;
      lon = geo.longitude;
      pais = geo.country_code;
    }
  }

  return getClima(ciudad, lat, lon, 'America/Argentina/Buenos_Aires', pais);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal: clima de la organización (ciudad natal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el clima de la ciudad configurada para la organización.
 * Si no hay configuración en Supabase, usa Buenos Aires como fallback.
 */
export function useClima() {
  return useQuery({
    queryKey: ['clima', 'org', ORG_ID],
    queryFn: fetchClimaOrg,
    staleTime: 30 * 60 * 1000, // 30 minutos — el clima no cambia tan seguido
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
    staleTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
