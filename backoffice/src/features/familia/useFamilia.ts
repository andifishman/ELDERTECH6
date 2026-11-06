import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { notify } from '@/components/ui/toast';
import * as service from '@/services/familiaService';

const K = {
  familiares: ['familia', 'familiares'] as const,
  solicitudes: ['familia', 'solicitudes'] as const,
  avisos: ['familia', 'avisos'] as const,
  lecturas: (id: string) => ['familia', 'avisos', id, 'lecturas'] as const,
  eventos: ['familia', 'eventos'] as const,
  inscripciones: (id: string) => ['familia', 'eventos', id, 'inscripciones'] as const,
  documentos: ['familia', 'documentos'] as const,
  albumes: ['familia', 'albumes'] as const,
  album: (id: string) => ['familia', 'albumes', id] as const,
  casos: ['familia', 'casos'] as const,
  caso: (id: string) => ['familia', 'casos', id] as const,
  categorias: ['familia', 'categorias'] as const,
  propuestas: ['familia', 'propuestas'] as const,
};

/** Mutación con aviso de éxito/error y refresco de las listas afectadas. */
function useAccion<TVars, TData>(fn: (v: TVars) => Promise<TData>, opciones: { ok?: string | ((d: TData, v: TVars) => string); error: string; invalidar: QueryKey[] }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      const mensaje = typeof opciones.ok === 'function' ? opciones.ok(data, vars) : opciones.ok;
      if (mensaje) notify.success(mensaje);
      opciones.invalidar.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
    },
    onError: (err: Error) => notify.error(opciones.error, err.message),
  });
}

// ─── Familiares ──────────────────────────────────────────────────────────────

export const useFamiliares = () => useQuery({ queryKey: K.familiares, queryFn: service.listarFamiliares });

export const useCrearFamiliar = () =>
  useAccion(service.crearFamiliar, {
    ok: (r) => (r.yaExistia ? 'Familiar vinculado (ya tenía cuenta)' : 'Familiar dado de alta: le llega la invitación por email'),
    error: 'No se pudo dar de alta al familiar',
    invalidar: [K.familiares],
  });

export const useActualizarFamiliar = () =>
  useAccion(({ id, cambios }: { id: string; cambios: Parameters<typeof service.actualizarFamiliar>[1] }) => service.actualizarFamiliar(id, cambios), {
    ok: 'Cambios guardados',
    error: 'No se pudo actualizar al familiar',
    invalidar: [K.familiares],
  });

export const useReinvitar = () =>
  useAccion(service.reinvitarFamiliar, {
    ok: (r) => (r.enviada ? 'Invitación reenviada por email' : 'Ya activó su cuenta: puede entrar con su email desde la app'),
    error: 'No se pudo reenviar la invitación',
    invalidar: [K.familiares],
  });

export const useVincular = () =>
  useAccion(({ familiarId, residenteId, parentesco }: { familiarId: string; residenteId: string; parentesco: string | null }) => service.vincularFamiliar(familiarId, residenteId, parentesco), {
    ok: 'Residente vinculado',
    error: 'No se pudo vincular',
    invalidar: [K.familiares],
  });

export const useRevocarVinculo = () => useAccion(service.revocarVinculo, { ok: 'Vínculo revocado: el familiar ya no ve a ese residente', error: 'No se pudo revocar el vínculo', invalidar: [K.familiares] });
export const useSolicitudes = () => useQuery({ queryKey: K.solicitudes, queryFn: service.listarSolicitudes });
export const useAprobarSolicitud = () =>
  useAccion(({ id, input }: { id: string; input: Parameters<typeof service.aprobarSolicitud>[1] }) => service.aprobarSolicitud(id, input), {
    ok: 'Solicitud aprobada: le llega la invitación por email',
    error: 'No se pudo aprobar la solicitud',
    invalidar: [K.solicitudes, K.familiares],
  });
export const useRechazarSolicitud = () => useAccion(service.rechazarSolicitud, { ok: 'Solicitud rechazada', error: 'No se pudo rechazar la solicitud', invalidar: [K.solicitudes] });

export const useReactivarVinculo = () => useAccion(service.reactivarVinculo, { ok: 'Vínculo reactivado', error: 'No se pudo reactivar el vínculo', invalidar: [K.familiares] });

// ─── Avisos ──────────────────────────────────────────────────────────────────

export const useAvisos = () => useQuery({ queryKey: K.avisos, queryFn: service.listarAvisos });
export const useLecturasAviso = (id: string | null) => useQuery({ queryKey: K.lecturas(id ?? ''), queryFn: () => service.lecturasDeAviso(id!), enabled: !!id });
export const useCrearAviso = () => useAccion(service.crearAviso, { ok: 'Aviso publicado', error: 'No se pudo publicar el aviso', invalidar: [K.avisos] });
export const useEliminarAviso = () => useAccion(service.eliminarAviso, { ok: 'Aviso eliminado', error: 'No se pudo eliminar el aviso', invalidar: [K.avisos] });

// ─── Eventos ─────────────────────────────────────────────────────────────────

export const useEventos = () => useQuery({ queryKey: K.eventos, queryFn: service.listarEventos });
export const useInscripciones = (id: string | null) => useQuery({ queryKey: K.inscripciones(id ?? ''), queryFn: () => service.inscripcionesDeEvento(id!), enabled: !!id });
export const useCrearEvento = () => useAccion(service.crearEvento, { ok: 'Evento creado', error: 'No se pudo crear el evento', invalidar: [K.eventos] });
export const useActualizarEvento = () =>
  useAccion(({ id, input }: { id: string; input: Partial<service.EventoInput> }) => service.actualizarEvento(id, input), { ok: 'Evento actualizado', error: 'No se pudo actualizar el evento', invalidar: [K.eventos] });
export const useEliminarEvento = () => useAccion(service.eliminarEvento, { ok: 'Evento eliminado', error: 'No se pudo eliminar el evento', invalidar: [K.eventos] });

// ─── Documentos ──────────────────────────────────────────────────────────────

export const useDocumentos = () => useQuery({ queryKey: K.documentos, queryFn: service.listarDocumentos });
export const useSubirDocumento = () =>
  useAccion(({ titulo, descripcion, archivo }: { titulo: string; descripcion: string; archivo: File }) => service.subirDocumento(titulo, descripcion, archivo), {
    ok: 'Documento publicado',
    error: 'No se pudo subir el documento',
    invalidar: [K.documentos],
  });
export const useEliminarDocumento = () => useAccion(service.eliminarDocumento, { ok: 'Documento eliminado', error: 'No se pudo eliminar el documento', invalidar: [K.documentos] });

// ─── Fotos ───────────────────────────────────────────────────────────────────

export const useAlbumes = () => useQuery({ queryKey: K.albumes, queryFn: service.listarAlbumes });
export const useAlbum = (id: string | undefined) => useQuery({ queryKey: K.album(id ?? ''), queryFn: () => service.obtenerAlbum(id!), enabled: !!id });
export const useCrearAlbum = () => useAccion(service.crearAlbum, { error: 'No se pudo crear el álbum', invalidar: [K.albumes] });
export const useActualizarAlbum = (id: string) =>
  useAccion((cambios: Parameters<typeof service.actualizarAlbum>[1]) => service.actualizarAlbum(id, cambios), {
    ok: (_d, v) => (v.publicar === undefined ? 'Álbum actualizado' : v.publicar ? 'Álbum publicado: las familias ya lo ven' : 'Álbum despublicado'),
    error: 'No se pudo actualizar el álbum',
    invalidar: [K.albumes, K.album(id)],
  });
export const useEliminarAlbum = () => useAccion(service.eliminarAlbum, { ok: 'Álbum eliminado', error: 'No se pudo eliminar el álbum', invalidar: [K.albumes] });
export const useSubirFotos = (id: string) =>
  useAccion((archivos: File[]) => service.subirFotos(id, archivos), {
    ok: (r) => `${r.subidas} foto${r.subidas === 1 ? '' : 's'} subida${r.subidas === 1 ? '' : 's'}`,
    error: 'No se pudieron subir las fotos',
    invalidar: [K.albumes, K.album(id)],
  });
export const useEliminarFoto = (albumId: string) => useAccion(service.eliminarFoto, { ok: 'Foto eliminada', error: 'No se pudo eliminar la foto', invalidar: [K.albumes, K.album(albumId)] });
export const useEliminarComentario = (albumId: string) => useAccion(service.eliminarComentario, { ok: 'Comentario eliminado', error: 'No se pudo eliminar el comentario', invalidar: [K.album(albumId)] });

// ─── Consultas, reclamos y propuestas ────────────────────────────────────────

export const useCasos = () => useQuery({ queryKey: K.casos, queryFn: service.listarCasos });
export const useCaso = (id: string | null) => useQuery({ queryKey: K.caso(id ?? ''), queryFn: () => service.obtenerCaso(id!), enabled: !!id });
export const useResponderCaso = (id: string) =>
  useAccion((texto: string) => service.responderCaso(id, texto), { ok: 'Respuesta enviada', error: 'No se pudo enviar la respuesta', invalidar: [K.casos, K.caso(id)] });
export const useCambiarEstadoCaso = (id: string) =>
  useAccion((estado: service.EstadoCaso) => service.cambiarEstadoCaso(id, estado), { ok: 'Estado actualizado', error: 'No se pudo cambiar el estado', invalidar: [K.casos, K.caso(id)] });
export const useCategorias = () => useQuery({ queryKey: K.categorias, queryFn: service.listarCategorias });
export const useCrearCategoria = () => useAccion(service.crearCategoria, { ok: 'Categoría creada', error: 'No se pudo crear la categoría', invalidar: [K.categorias] });
export const useActualizarCategoria = () =>
  useAccion(({ id, cambios }: { id: string; cambios: { nombre?: string; activa?: boolean } }) => service.actualizarCategoria(id, cambios), {
    ok: 'Categoría actualizada',
    error: 'No se pudo actualizar la categoría',
    invalidar: [K.categorias],
  });
export const usePropuestas = () => useQuery({ queryKey: K.propuestas, queryFn: service.listarPropuestas });
export const useResponderPropuesta = () =>
  useAccion(({ id, estado, respuesta }: { id: string; estado: service.EstadoPropuesta; respuesta: string | null }) => service.responderPropuesta(id, estado, respuesta), {
    ok: 'Respuesta guardada',
    error: 'No se pudo responder la propuesta',
    invalidar: [K.propuestas],
  });
