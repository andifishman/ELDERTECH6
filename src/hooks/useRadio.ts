//hook de react-query para cargar el catálogo de radios desde el backend
import { useQuery } from '@tanstack/react-query';
import { getRadioData } from '@/services/radioService';
import type { RadioData } from '@/types/radio.types';

export const RADIO_DATA_KEY = ['radio-data'];

// Se mantiene este nombre (exportado para que el prefetch del Home lo use)
// aunque ya no arme ningún fallback acá — el backend ya decide entre Supabase
// y su catálogo hardcodeado antes de responder.
export async function fetchRadioDataConFallback(): Promise<RadioData> {
  return getRadioData();
}

export function useRadioData() {
  return useQuery({
    queryKey: RADIO_DATA_KEY,
    queryFn: fetchRadioDataConFallback,
    staleTime: 60 * 60 * 1000, // 1h — las radios cambian poco
    retry: 1,
  });
}
