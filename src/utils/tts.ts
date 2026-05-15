import * as Speech from 'expo-speech';

let hablandoId: string | null = null;

/** Habla el texto en español. Si ya está hablando el mismo texto, lo detiene. */
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

export async function detenerHabla(): Promise<void> {
  const estaHablando = await Speech.isSpeakingAsync();
  if (estaHablando) {
    Speech.stop();
    hablandoId = null;
  }
}

export async function estaHablando(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
