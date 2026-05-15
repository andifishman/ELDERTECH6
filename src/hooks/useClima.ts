import { useQuery } from '@tanstack/react-query';
import { supabase, ORG_ID } from '@/services/supabase';
import { geocodificarCiudad, getClima } from '@/services/climaService';
import type { ConfiguracionClima } from '@/types/database.types';

async function fetchClimaOrg(): Promise<ReturnType<typeof getClima>> {
  // 1. Leer config de Supabase
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
    // Fallback: Buenos Aires hardcodeado para desarrollo
    ciudad = 'Buenos Aires';
    lat = -34.6037;
    lon = -58.3816;
  } else {
    const config = data as ConfiguracionClima;
    ciudad = config.ciudad;
    pais = 'AR'; // podría derivarse de la org

    if (config.latitud && config.longitud) {
      lat = Number(config.latitud);
      lon = Number(config.longitud);
    } else {
      // Geocodificar si no hay coords guardadas
      const geo = await geocodificarCiudad(ciudad);
      lat = geo.latitude;
      lon = geo.longitude;
      pais = geo.country_code;
    }
  }

  return getClima(ciudad, lat, lon, 'America/Argentina/Buenos_Aires', pais);
}

export function useClima() {
  return useQuery({
    queryKey: ['clima', ORG_ID],
    queryFn: fetchClimaOrg,
    staleTime: 30 * 60 * 1000, // 30 min — clima se actualiza cada media hora
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
