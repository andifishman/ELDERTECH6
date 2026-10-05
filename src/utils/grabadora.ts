// Grabación de voz — implementación NATIVA (Android/iOS) con expo-av.
// En web Metro usa grabadora.web.ts (MediaRecorder del navegador).
//
// Las tres pantallas que graban (Asistente, Hablemos, Pedidos) usaban expo-av
// directo. Se centralizó acá para que cada plataforma resuelva a su manera lo que
// no es igual: permisos, formato del archivo y modo de audio.
import { Audio } from 'expo-av';

/** Lo mínimo que las pantallas necesitan de una grabación en curso. */
export interface Grabacion {
  stopAndUnloadAsync(): Promise<unknown>;
  getURI(): string | null;
}

export interface PermisoMicrofono {
  granted: boolean;
  /** Texto listo para mostrarle a la persona cuando no se otorgó. */
  mensaje: string;
}

export async function pedirPermisoMicrofono(): Promise<PermisoMicrofono> {
  const { granted } = await Audio.requestPermissionsAsync();
  return {
    granted,
    mensaje: 'Para usar el micrófono, activá el permiso en los ajustes del teléfono.',
  };
}

export async function iniciarGrabacion(): Promise<Grabacion> {
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  return recording;
}

/** Vuelve el modo de audio a "solo reproducción" (en iOS el modo grabación baja el volumen del parlante). */
export async function finalizarModoGrabacion(): Promise<void> {
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
}
