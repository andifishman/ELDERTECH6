import { useQuery } from '@tanstack/react-query';
import { getRadios, RADIOS_FALLBACK } from '@/services/radioService';
import { ORG_ID } from '@/services/supabase';

export function useRadios() {
  return useQuery({
    queryKey: ['radios'],
    queryFn: async () => {
      try {
        if (!ORG_ID) return RADIOS_FALLBACK;
        const grupos = await getRadios();
        return grupos.length ? grupos : RADIOS_FALLBACK;
      } catch {
        return RADIOS_FALLBACK;
      }
    },
    staleTime: 60 * 60 * 1000, // 1h — lista de radios cambia poco
    retry: 1,
  });
}
