//utilidad para texto a voz — usa expo-speech con voz en español para adultos mayores
import * as Speech from 'expo-speech';

//guarda el texto que se está leyendo para saber si hay que detener o empezar
let hablandoId: string | null = null;

//lee el texto en voz alta; si ya está hablando lo detiene
export async function hablar(texto: string): Promise<void> {
  const estaHablando = await Speech.isSpeakingAsync();

  if (estaHablando) {
    Speech.stop();
    hablandoId = null;
    return;
  }

  hablandoId = texto;
  Speech.speak(texto, {
    language: 'es-AR',
    pitch: 1.0,
    rate: 0.85, // ligeramente más lento para adultos mayores
    onDone: () => { hablandoId = null; },
    onError: () => { hablandoId = null; },
    onStopped: () => { hablandoId = null; },
  });
}

//detiene la lectura si está activa
export async function detenerHabla(): Promise<void> {
  const estaHablando = await Speech.isSpeakingAsync();
  if (estaHablando) {
    Speech.stop();
    hablandoId = null;
  }
}

//devuelve true si el sintetizador de voz está activo en este momento
export async function estaHablando(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
