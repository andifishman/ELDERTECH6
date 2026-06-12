//hook de react-query para cargar el catálogo de radios; usa fallback si supabase falla
import { useQuery } from '@tanstack/react-query';
import { getRadioData, RADIO_DATA_FALLBACK } from '@/services/radioService';
import { ORG_ID } from '@/services/supabase';
import type { RadioData } from '@/types/radio.types';

export const RADIO_DATA_KEY = ['radio-data'];

//carga las radios desde supabase; si falla o no hay datos usa el catálogo hardcodeado
//(exportada para que el prefetch del Home use la misma lógica)
export async function fetchRadioDataConFallback(): Promise<RadioData> {
  try {
    //si no hay org configurada, ir directo al fallback
    if (!ORG_ID) return RADIO_DATA_FALLBACK;
    const data = await getRadioData();
    //si supabase devuelve vacío, usar el fallback también
    return data.radios.length ? data : RADIO_DATA_FALLBACK;
  } catch {
    return RADIO_DATA_FALLBACK;
  }
}

export function useRadioData() {
  return useQuery({
    queryKey: RADIO_DATA_KEY,
    queryFn: fetchRadioDataConFallback,
    staleTime: 60 * 60 * 1000, // 1h — las radios cambian poco
    retry: 1,
  });
}
