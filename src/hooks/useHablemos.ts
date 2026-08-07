// Hooks de React Query para el módulo Hablemos
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buscarResidentes,
  enviarMensajeAudio,
  enviarMensajeTexto,
  iniciarConversacion,
  listarConversaciones,
  listarMensajes,
  marcarLeidos,
  marcarRecibidos,
  type MensajeHablemos,
} from '@/services/hablemosService';

const MENSAJES_POR_PAGINA = 30;

export const KEYS = {
  conversaciones: ['hablemos', 'conversaciones'] as const,
  mensajes: (conversacionId: string) => ['hablemos', 'mensajes', conversacionId] as const,
  busqueda: (q: string) => ['hablemos', 'buscar', q] as const,
};

export function useConversacionesHablemos() {
  return useQuery({
    queryKey: KEYS.conversaciones,
    queryFn: listarConversaciones,
    staleTime: 1000 * 5,
    // Realtime de Supabase es la vía rápida, pero en celulares reales el
    // websocket se cae con la red móvil / pantalla apagada y los mensajes
    // tardaban minutos en aparecer. Este polling es la red de seguridad.
    refetchInterval: 1000 * 10,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}

export function useBuscarResidentesHablemos(query: string) {
  return useQuery({
    queryKey: KEYS.busqueda(query),
    queryFn: () => buscarResidentes(query),
    // Sin `enabled` — con texto vacío el backend devuelve todos los residentes,
    // así la pantalla de "nueva conversación" arranca mostrando la lista completa.
    staleTime: 1000 * 10,
  });
}

export function useIniciarConversacionHablemos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residenteId: string) => iniciarConversacion(residenteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
    },
  });
}

export function useMensajesHablemos(conversacionId: string) {
  return useInfiniteQuery({
    queryKey: KEYS.mensajes(conversacionId),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listarMensajes(conversacionId, { before: pageParam, limit: MENSAJES_POR_PAGINA }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina: MensajeHablemos[]) =>
      ultimaPagina.length < MENSAJES_POR_PAGINA ? undefined : ultimaPagina[ultimaPagina.length - 1].created_at,
  });
}

/**
 * Sondeo de respaldo para la conversación abierta.
 *
 * Realtime (websocket de Supabase) es la vía rápida, pero en un celular real se
 * cae seguido — red móvil, pantalla apagada, app en background — y entonces el
 * mensaje solo aparecía cuando algo forzaba un refetch (podían pasar minutos,
 * aunque la push notification ya hubiera llegado). Esto pide solo la página más
 * nueva cada pocos segundos y mergea el resultado en la cache del infinite
 * query, sin tocar la paginación hacia atrás.
 */
export function usePollingMensajesHablemos(conversacionId: string, activo: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['hablemos', 'mensajes-poll', conversacionId] as const,
    queryFn: async () => {
      const recientes = await listarMensajes(conversacionId, { limit: MENSAJES_POR_PAGINA });
      mergearMensajesEnCache(qc, conversacionId, recientes);
      return recientes.length;
    },
    enabled: activo && Boolean(conversacionId),
    refetchInterval: 1000 * 4,
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}

export function useEnviarMensajeTextoHablemos(conversacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contenido: string) => enviarMensajeTexto(conversacionId, contenido),
    onSuccess: (mensaje) => {
      agregarMensajeALaCache(qc, conversacionId, mensaje);
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
    },
  });
}

export function useEnviarMensajeAudioHablemos(conversacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ audioUri, duracionSegundos }: { audioUri: string; duracionSegundos: number }) =>
      enviarMensajeAudio(conversacionId, audioUri, duracionSegundos),
    onSuccess: (mensaje) => {
      agregarMensajeALaCache(qc, conversacionId, mensaje);
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
    },
  });
}

export function useMarcarLeidosHablemos(conversacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => marcarLeidos(conversacionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.conversaciones });
    },
  });
}

export function useMarcarRecibidosHablemos(conversacionId: string) {
  return useMutation({
    mutationFn: () => marcarRecibidos(conversacionId),
  });
}

interface PaginaMensajes {
  pages: MensajeHablemos[][];
  pageParams: unknown[];
}

/** Antepone un mensaje nuevo a la página más reciente sin refetchear — usado tanto por el envío propio como por Realtime. */
export function agregarMensajeALaCache(
  qc: ReturnType<typeof useQueryClient>,
  conversacionId: string,
  mensaje: MensajeHablemos,
): void {
  qc.setQueryData<PaginaMensajes>(KEYS.mensajes(conversacionId), (actual) => {
    if (!actual) return { pages: [[mensaje]], pageParams: [undefined] };
    const yaExiste = actual.pages.some((pagina) => pagina.some((m) => m.id === mensaje.id));
    if (yaExiste) return actual;
    const [primera, ...resto] = actual.pages;
    return { ...actual, pages: [[mensaje, ...(primera ?? [])], ...resto] };
  });
}

/**
 * Mergea la página más reciente traída del backend contra lo que ya hay en cache:
 * los mensajes conocidos se pisan con la versión del servidor y los nuevos se
 * agregan a la primera página, que queda reordenada de más nuevo a más viejo.
 *
 * Antes acá solo se comparaba `estado` para decidir si pisar un mensaje ya
 * presente — si alguna vez quedaba cacheado un `contenido` incompleto (por
 * ejemplo, por un evento de Realtime con el payload recortado), un sondeo
 * posterior con el estado sin cambios lo daba por bueno y descartaba en
 * silencio la versión completa recién pedida al servidor: el texto trunco
 * quedaba pegado para siempre. Ahora se compara el mensaje entero, así
 * cualquier diferencia de contenido se autocorrige en el próximo sondeo.
 */
export function mergearMensajesEnCache(
  qc: ReturnType<typeof useQueryClient>,
  conversacionId: string,
  recientes: MensajeHablemos[],
): void {
  if (recientes.length === 0) return;
  qc.setQueryData<PaginaMensajes>(KEYS.mensajes(conversacionId), (actual) => {
    if (!actual) return { pages: [recientes], pageParams: [undefined] };

    const porId = new Map(recientes.map((m) => [m.id, m]));
    let huboCambios = false;

    const pages = actual.pages.map((pagina) =>
      pagina.map((m) => {
        const actualizado = porId.get(m.id);
        if (!actualizado) return m;
        porId.delete(m.id);
        if (
          actualizado.contenido === m.contenido &&
          actualizado.estado === m.estado &&
          actualizado.audio_url === m.audio_url &&
          actualizado.audio_duracion_segundos === m.audio_duracion_segundos
        ) {
          return m;
        }
        huboCambios = true;
        return actualizado;
      }),
    );

    const nuevos = [...porId.values()];
    if (nuevos.length === 0) return huboCambios ? { ...actual, pages } : actual;

    const [primera = [], ...resto] = pages;
    const primeraMergeada = [...nuevos, ...primera].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return { ...actual, pages: [primeraMergeada, ...resto] };
  });
}

/** Actualiza el estado (enviado/recibido/leído) de un mensaje ya presente en la cache — usado por Realtime. */
export function actualizarEstadoMensajeEnCache(
  qc: ReturnType<typeof useQueryClient>,
  conversacionId: string,
  mensaje: MensajeHablemos,
): void {
  qc.setQueryData<PaginaMensajes>(KEYS.mensajes(conversacionId), (actual) => {
    if (!actual) return actual;
    return {
      ...actual,
      pages: actual.pages.map((pagina) => pagina.map((m) => (m.id === mensaje.id ? mensaje : m))),
    };
  });
}
