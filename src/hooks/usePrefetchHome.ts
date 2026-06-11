/**
 * usePrefetchHome.ts
 * ──────────────────
 * Apenas el usuario llega al Home con el perfil cargado, precarga en
 * background los datos de las secciones principales (contactos, actividades
 * de hoy, radios, tutoriales y clima). Así, cuando toca cualquier botón del
 * menú, la pantalla abre con los datos ya en caché en vez de mostrar spinner.
 *
 * prefetchQuery no hace nada si la query ya está fresca en caché, así que
 * es seguro llamarlo cada vez que se monta el Home.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ORG_ID } from '@/services/supabase';
import { getContactos } from '@/services/contactosService';
import { getCategoriasTutorial, getTutorialesConProgreso } from '@/services/tutorialesService';
import { getActividadesPersonalizadas, getActividadesPorFecha } from '@/services/actividadesService';
import { contactosKey } from './useContactos';
import { actividadesKey } from './useActividades';
import { KEYS as TUTORIALES_KEYS } from './useTutoriales';
import { fetchClimaOrg } from './useClima';
import { RADIO_DATA_KEY, fetchRadioDataConFallback } from './useRadio';

export function usePrefetchHome() {
  const qc = useQueryClient();
  const { profile, isLoading } = useAuth();

  const residenteId = profile?.residente?.id ?? null;
  const miPiso = profile?.residente?.piso ?? null;
  // Key estable: misma construcción que useActividades para que coincida la queryKey
  const interesesKey = [...(profile?.residente_interes_ids ?? [])].sort().join(',');

  useEffect(() => {
    if (isLoading) return;

    const hoy = new Date();
    const misInteresesIds = interesesKey ? interesesKey.split(',') : [];

    // Actividades de hoy (lo primero que suele abrirse)
    qc.prefetchQuery({
      queryKey: actividadesKey(hoy, residenteId, interesesKey, miPiso),
      queryFn: () =>
        residenteId
          ? getActividadesPersonalizadas(hoy, misInteresesIds, miPiso)
          : getActividadesPorFecha(hoy),
      staleTime: 30 * 60 * 1000,
    });

    // Catálogo de radios
    qc.prefetchQuery({
      queryKey: RADIO_DATA_KEY,
      queryFn: fetchRadioDataConFallback,
      staleTime: 60 * 60 * 1000,
    });

    // Clima de la organización
    qc.prefetchQuery({
      queryKey: ['clima', 'org', ORG_ID],
      queryFn: fetchClimaOrg,
      staleTime: 10 * 60 * 1000,
    });

    if (residenteId) {
      // Contactos del módulo Llamar
      qc.prefetchQuery({
        queryKey: contactosKey(residenteId),
        queryFn: () => getContactos(residenteId),
        staleTime: 5 * 60 * 1000,
      });

      // Tutoriales (lista completa + categorías)
      qc.prefetchQuery({
        queryKey: TUTORIALES_KEYS.lista(residenteId, null),
        queryFn: () => getTutorialesConProgreso(residenteId, null),
        staleTime: 5 * 60 * 1000,
      });
      qc.prefetchQuery({
        queryKey: TUTORIALES_KEYS.categorias,
        queryFn: getCategoriasTutorial,
        staleTime: 30 * 60 * 1000,
      });
    }
  }, [qc, isLoading, residenteId, interesesKey, miPiso]);
}
