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
  consultarIA,
  actualizarTituloSesion,
  generarTituloSesion,
} from '@/services/asistenteService';
import type { MensajeContexto } from '@/types/asistente.types';

// ─── FAQ ─────────────────────────────────────────────────────────────────────

// Datos iniciales del FAQ — se muestran instantáneamente mientras Supabase responde
const FAQ_PLACEHOLDER: import('@/types/asistente.types').FaqAsistente[] = [
  { id: '1', pregunta: '¿Cómo mando un mensaje por WhatsApp?', categoria: 'whatsapp', emoji: '💬', orden: 1, activo: true },
  { id: '2', pregunta: '¿Cómo hago una videollamada?',         categoria: 'llamadas', emoji: '📹', orden: 2, activo: true },
  { id: '3', pregunta: '¿Cómo veo mis fotos?',                 categoria: 'fotos',    emoji: '📷', orden: 3, activo: true },
  { id: '4', pregunta: '¿Cómo subo el volumen?',               categoria: 'celular',  emoji: '🔊', orden: 4, activo: true },
  { id: '5', pregunta: '¿Cómo hago una llamada telefónica?',   categoria: 'llamadas', emoji: '📞', orden: 5, activo: true },
  { id: '6', pregunta: '¿Cómo conecto el WiFi?',               categoria: 'internet', emoji: '📶', orden: 6, activo: true },
  { id: '7', pregunta: '¿Cómo uso el clima en la app?',        categoria: 'eldertech', emoji: '🌤️', orden: 7, activo: true },
  { id: '8', pregunta: '¿Cómo escucho la radio?',              categoria: 'eldertech', emoji: '📻', orden: 8, activo: true },
  { id: '9', pregunta: '¿Cómo agrando la letra del celular?',  categoria: 'celular',  emoji: '🔍', orden: 9, activo: true },
  { id: '10', pregunta: '¿Cómo cargo la batería correctamente?', categoria: 'celular', emoji: '🔋', orden: 10, activo: true },
];

export function useFaq() {
  return useQuery({
    queryKey: ['faq_asistente'],
    queryFn: getFaq,
    staleTime: 1000 * 60 * 60, // 1h — el FAQ cambia poco
    placeholderData: FAQ_PLACEHOLDER,
  });
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export function useSesionesRecientes(residenteId: string | null) {
  return useQuery({
    queryKey: ['sesiones_asistente', residenteId],
    queryFn: () => getSesionesRecientes(residenteId!),
    enabled: !!residenteId,
    staleTime: 1000 * 30,
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

export function useMensajesFavoritos(residenteId: string | null) {
  return useQuery({
    queryKey: ['mensajes_favoritos', residenteId],
    queryFn: () => getMensajesFavoritos(residenteId!),
    enabled: !!residenteId,
    staleTime: 1000 * 30,
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

      const conTimeout = <T>(p: Promise<T>, ms: number, msg?: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(msg ?? 'timeout')), ms),
          ),
        ]);

      // Objeto local de fallback para cuando Supabase no responde a tiempo
      const msgLocalUsuario = () => ({
        id: 'u_' + Date.now(), sesion_id: sesionId, residente_id: residenteId,
        rol: 'usuario' as const, contenido: pregunta, es_favorito: false, created_at: new Date().toISOString(),
      });
      const msgLocalAsistente = (contenido: string) => ({
        id: 'a_' + Date.now(), sesion_id: sesionId, residente_id: residenteId,
        rol: 'asistente' as const, contenido, es_favorito: false, created_at: new Date().toISOString(),
      });

      // 1. Guardar mensaje usuario con timeout propio corto — si Supabase cuelga,
      //    no bloquea la IA. El mensaje se muestra igual localmente.
      const guardarUsuarioPromise = esLocal
        ? Promise.resolve(msgLocalUsuario())
        : conTimeout(guardarMensaje(sesionId, residenteId, 'usuario', pregunta), 5000)
            .catch(() => msgLocalUsuario());

      // 2. Llamar a la IA — operación principal (67s = 3/4 de 90s anteriores)
      const iaPromise = conTimeout(
        consultarIA(pregunta, historial),
        67000,
        'La IA tardó demasiado. Tocá Reintentar.',
      );

      const [msgUsuario, { texto: respuesta, navegacion }] = await Promise.all([
        guardarUsuarioPromise,
        iaPromise,
      ]);

      // 3. Guardar respuesta del asistente con timeout propio — tampoco bloquea
      const msgAsistente = esLocal
        ? msgLocalAsistente(respuesta)
        : await conTimeout(guardarMensaje(sesionId, residenteId, 'asistente', respuesta), 5000)
            .catch(() => msgLocalAsistente(respuesta));

      // 4. Generar título en background — no bloquea mostrar la respuesta al usuario
      if (!esLocal && esPrimerMensaje) {
        generarTituloSesion(pregunta)
          .then((titulo) => actualizarTituloSesion(sesionId, titulo))
          .then(() => qc.invalidateQueries({ queryKey: ['sesiones_asistente'] }))
          .catch(() => {});
      }

      return { msgUsuario, msgAsistente, navegacion };
    },
    // No invalidar mensajes — el chat usa estado local optimista para evitar duplicados
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
