// ========================================
// HOOK: useRealtime
// DESCRIPCIÓN:
// Suscribe una tabla de Supabase a cambios en tiempo real
// e invalida las queries de React Query asociadas. Es el
// puente que hace que un cambio del backoffice se refleje
// al instante tanto aquí como en la app móvil.
// ========================================
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtime(tabla: string, invalidarKeys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // canal único por tabla; ante cualquier INSERT/UPDATE/DELETE invalidamos caché
    const canal = supabase
      .channel(`rt-${tabla}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        invalidarKeys.forEach((key) => {
          void queryClient.invalidateQueries({ queryKey: key as unknown[] });
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
    // invalidarKeys es estable por convención (definida en módulo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, queryClient]);
}
