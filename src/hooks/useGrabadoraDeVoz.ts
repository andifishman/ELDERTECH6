import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { pedirPermisoMicrofono, iniciarGrabacion as crearGrabacion, finalizarModoGrabacion, type Grabacion } from '@/utils/grabadora';

export interface GrabacionTerminada {
  uri: string;
  /** Duración redondeada a segundos, mínimo 1. */
  duracionSegundos: number;
}

/**
 * Ciclo de vida de una grabación de voz (permiso → grabar → detener / descartar),
 * común a las pantallas que graban mensajes (Hablemos, Pedidos). La plataforma
 * (expo-av o MediaRecorder) la resuelve `@/utils/grabadora`; acá solo vive el
 * estado de la pantalla. Se detiene sola si la pantalla se desmonta grabando.
 */
export function useGrabadoraDeVoz(logTag: string) {
  const [grabando, setGrabando] = useState(false);
  const grabacionRef = useRef<Grabacion | null>(null);
  const inicioRef = useRef(0);

  useEffect(() => {
    return () => {
      grabacionRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const iniciar = useCallback(async (): Promise<void> => {
    try {
      const permiso = await pedirPermisoMicrofono();
      if (!permiso.granted) {
        Alert.alert('Permiso de micrófono', permiso.mensaje);
        return;
      }
      grabacionRef.current = await crearGrabacion();
      inicioRef.current = Date.now();
      setGrabando(true);
    } catch (err) {
      console.warn(`[${logTag}] Error al iniciar grabación:`, err);
      Alert.alert('Error', 'No se pudo iniciar el micrófono. Intentá de nuevo.');
    }
  }, [logTag]);

  /** Corta la grabación y devuelve el archivo, o `null` si no había nada grabando o falló. */
  const detener = useCallback(async (): Promise<GrabacionTerminada | null> => {
    const grabacion = grabacionRef.current;
    if (!grabacion) return null;
    try {
      await grabacion.stopAndUnloadAsync();
      await finalizarModoGrabacion();
      const uri = grabacion.getURI();
      if (!uri) return null;
      return { uri, duracionSegundos: Math.max(1, Math.round((Date.now() - inicioRef.current) / 1000)) };
    } catch (err) {
      console.warn(`[${logTag}] Error al detener grabación:`, err);
      return null;
    } finally {
      grabacionRef.current = null;
      setGrabando(false);
    }
  }, [logTag]);

  /** Corta la grabación y tira el audio. */
  const descartar = useCallback(async (): Promise<void> => {
    const grabacion = grabacionRef.current;
    grabacionRef.current = null;
    setGrabando(false);
    if (!grabacion) return;
    try {
      await grabacion.stopAndUnloadAsync();
      await finalizarModoGrabacion();
    } catch {}
  }, []);

  return { grabando, iniciar, detener, descartar };
}
