// Hooks del módulo Asistente — React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFaq,
  getSesionesRecientes,
  getMensajesDeSesion,
  getMensajesFavoritos,
  crearSesion,
  guardarMensaje,
  toggleFavoritoMensaje,
  consultarGemini,
  actualizarTituloSesion,
  generarTituloSesion,
} from '@/services/asistenteService';
import type { MensajeContexto } from '@/types/asistente.types';

// ─── FAQ ─────────────────────────────────────────────────────────────────────

export function useFaq() {
  return useQuery({
    queryKey: ['faq_asistente'],
    queryFn: getFaq,
    staleTime: 1000 * 60 * 60, // 1h — el FAQ cambia poco
  });
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export function useSesionesRecientes(residenteId: string | null) {
  return useQuery({
    queryKey: ['sesiones_asistente', residenteId],
    queryFn: () => getSesionesRecientes(residenteId!),
    enabled: !!residenteId,
  });
}

export function useCrearSesion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (residenteId: string) => crearSesion(residenteId),
    onSuccess: (_, residenteId) => {
      qc.invalidateQueries({ queryKey: ['sesiones_asistente', residenteId] });
    },
  });
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export function useMensajesDeSesion(sesionId: string | null) {
  return useQuery({
    queryKey: ['mensajes_asistente', sesionId],
    queryFn: () => getMensajesDeSesion(sesionId!),
    enabled: !!sesionId,
  });
}

export function useMensajesFavoritos(residenteId: string | null) {
  return useQuery({
    queryKey: ['mensajes_favoritos', residenteId],
    queryFn: () => getMensajesFavoritos(residenteId!),
    enabled: !!residenteId,
  });
}

export function useToggleFavoritoMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mensajeId,
      esFavorito,
    }: {
      mensajeId: string;
      esFavorito: boolean;
    }) => toggleFavoritoMensaje(mensajeId, esFavorito),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensajes_favoritos'] });
    },
  });
}

// ─── Enviar mensaje (flujo completo) ─────────────────────────────────────────

interface EnviarMensajeParams {
  sesionId: string;
  residenteId: string;
  pregunta: string;
  historial: MensajeContexto[];
  esPrimerMensaje: boolean;
}

export function useEnviarMensaje() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sesionId,
      residenteId,
      pregunta,
      historial,
      esPrimerMensaje,
    }: EnviarMensajeParams) => {
      const esLocal = sesionId.startsWith('local_');

      // 1. Guardar mensaje del usuario (solo si sesión real)
      const msgUsuario = esLocal
        ? { id: 'u_' + Date.now(), sesion_id: sesionId, residente_id: residenteId, rol: 'usuario' as const, contenido: pregunta, es_favorito: false, created_at: new Date().toISOString() }
        : await guardarMensaje(sesionId, residenteId, 'usuario', pregunta);

      // 2. Consultar Gemini
      const respuesta = await consultarGemini(pregunta, historial);

      // 3. Guardar respuesta del asistente (solo si sesión real)
      const msgAsistente = esLocal
        ? { id: 'a_' + Date.now(), sesion_id: sesionId, residente_id: residenteId, rol: 'asistente' as const, contenido: respuesta, es_favorito: false, created_at: new Date().toISOString() }
        : await guardarMensaje(sesionId, residenteId, 'asistente', respuesta);

      // 4. Título de sesión (solo si sesión real y primer mensaje)
      if (!esLocal && esPrimerMensaje) {
        // Genera un título descriptivo con IA; cae a truncado si Gemini falla
        const titulo = await generarTituloSesion(pregunta);
        await actualizarTituloSesion(sesionId, titulo);
        qc.invalidateQueries({ queryKey: ['sesiones_asistente'] });
      }

      return { msgUsuario, msgAsistente };
    },
    onSuccess: (_, { sesionId }) => {
      qc.invalidateQueries({ queryKey: ['mensajes_asistente', sesionId] });
    },
  });
}

// ─── Títulos retroactivos ─────────────────────────────────────────────────────

/**
 * Para sesiones sin título, recupera el primer mensaje del usuario
 * y genera un título con IA. Se llama desde la pantalla de historial.
 */
export function useGenerarTitulosFaltantes(residenteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sesiones: import('@/types/asistente.types').SesionAsistente[]) => {
      const sinTitulo = sesiones.filter((s) => !s.titulo);
      for (const sesion of sinTitulo) {
        try {
          const mensajes = await getMensajesDeSesion(sesion.id);
          const primerMensajeUsuario = mensajes.find((m) => m.rol === 'usuario');
          if (!primerMensajeUsuario) continue;
          const titulo = await generarTituloSesion(primerMensajeUsuario.contenido);
          await actualizarTituloSesion(sesion.id, titulo);
        } catch {
          // Ignorar errores individuales — no bloquear el resto
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesiones_asistente', residenteId] });
    },
  });
}
