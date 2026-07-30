import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/components/ui/toast';
import {
  actualizarNotificacion,
  cancelarProgramacion,
  crearNotificacion,
  duplicarNotificacion,
  eliminarNotificacion,
  enviarAhora,
  listarDestinatarios,
  listarLogs,
  listarNotificaciones,
  obtenerNotificacion,
  previsualizarAudiencia,
  programarNotificacion,
  reenviarNotificacion,
  type AccionCreacion,
  type DestinoFiltro,
  type DestinoTipo,
  type ListarFiltros,
  type NotificacionInput,
  type Recurrencia,
} from '@/services/notificacionesService';

const KEY_LISTA = (filtros: ListarFiltros) => ['notificaciones', filtros] as const;
const KEY_DETALLE = (id: string) => ['notificacion', id] as const;

export function useNotificacionesLista(filtros: ListarFiltros) {
  return useQuery({ queryKey: KEY_LISTA(filtros), queryFn: () => listarNotificaciones(filtros) });
}

export function useNotificacionDetalle(id?: string) {
  return useQuery({ queryKey: KEY_DETALLE(id ?? ''), queryFn: () => obtenerNotificacion(id!), enabled: !!id });
}

export function useDestinatarios(id?: string) {
  return useQuery({ queryKey: ['notificacion-destinatarios', id], queryFn: () => listarDestinatarios(id!), enabled: !!id });
}

export function useNotificacionLogs(id?: string) {
  return useQuery({ queryKey: ['notificacion-logs', id], queryFn: () => listarLogs(id!), enabled: !!id });
}

export function usePreviewAudiencia(
  destinoTipo: DestinoTipo,
  destinoFiltro: DestinoFiltro | null,
  excluir: string[] | null,
  incluir: string[] | null,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ['preview-audiencia', destinoTipo, destinoFiltro, excluir, incluir],
    queryFn: () => previsualizarAudiencia(destinoTipo, destinoFiltro, excluir, incluir),
    enabled: habilitado,
    staleTime: 1000 * 10,
  });
}

function useInvalidarLista() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['notificaciones'] });
}

export function useCrearNotificacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: ({ notificacion, accion }: { notificacion: NotificacionInput; accion: AccionCreacion }) => crearNotificacion(notificacion, accion),
    onSuccess: (_data, vars) => {
      const msg = vars.accion === 'enviar' ? 'Notificación enviada' : vars.accion === 'programar' ? 'Notificación programada' : 'Borrador guardado';
      notify.success(msg);
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo guardar la notificación', err.message),
  });
}

export function useActualizarNotificacion() {
  const invalidar = useInvalidarLista();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NotificacionInput> }) => actualizarNotificacion(id, input),
    onSuccess: (_data, vars) => {
      notify.success('Notificación actualizada');
      invalidar();
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(vars.id) });
    },
    onError: (err: Error) => notify.error('No se pudo actualizar', err.message),
  });
}

export function useEliminarNotificacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: (id: string) => eliminarNotificacion(id),
    onSuccess: () => {
      notify.success('Notificación eliminada');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo eliminar', err.message),
  });
}

export function useEnviarAhora() {
  const invalidar = useInvalidarLista();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enviarAhora(id),
    onSuccess: (data) => {
      notify.success('Notificación enviada');
      invalidar();
      void qc.invalidateQueries({ queryKey: KEY_DETALLE(data.id) });
    },
    onError: (err: Error) => notify.error('No se pudo enviar', err.message),
  });
}

export function useProgramarNotificacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: ({ id, programadaPara, recurrencia }: { id: string; programadaPara: string; recurrencia?: Recurrencia }) =>
      programarNotificacion(id, programadaPara, recurrencia),
    onSuccess: () => {
      notify.success('Notificación programada');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo programar', err.message),
  });
}

export function useCancelarProgramacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: (id: string) => cancelarProgramacion(id),
    onSuccess: () => {
      notify.success('Programación cancelada');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo cancelar', err.message),
  });
}

export function useReenviarNotificacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: (id: string) => reenviarNotificacion(id),
    onSuccess: () => {
      notify.success('Notificación reenviada');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo reenviar', err.message),
  });
}

export function useDuplicarNotificacion() {
  const invalidar = useInvalidarLista();
  return useMutation({
    mutationFn: (id: string) => duplicarNotificacion(id),
    onSuccess: () => {
      notify.success('Notificación duplicada como borrador');
      invalidar();
    },
    onError: (err: Error) => notify.error('No se pudo duplicar', err.message),
  });
}
