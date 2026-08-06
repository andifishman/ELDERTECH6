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
    staleTime: 1000 * 15,
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
