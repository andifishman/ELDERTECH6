//utilidad para texto a voz — usa expo-speech con voz en español para adultos mayores
import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

//guarda el texto que se está leyendo para saber si hay que detener o empezar
let hablandoId: string | null = null;

// Motor de TTS y voces instaladas varían por fabricante — un Samsung con
// "Samsung TTS" como motor por defecto puede no tener la variante exacta
// "es-AR" (aunque sí tenga español genérico), y entonces Speech.speak()
// fallaba en silencio: no sonaba nada y no había ningún error visible. Se
// busca una vez la mejor voz en español realmente instalada en ESTE equipo
// y se usa su identifier, en vez de asumir que "es-AR" siempre existe.
//
// Esto es SOLO nativo (Platform.OS !== 'web' abajo): en web ya existe un
// mecanismo propio y más completo para lo mismo (src/utils/audioWeb.ts, que
// parchea window.speechSynthesis directo) — duplicar la selección de voz acá
// arriesga pisarse con ese parche en vez de complementarlo.
let vozEsPromise: Promise<string | null> | null = null;

async function obtenerVozEs(): Promise<string | null> {
  if (!vozEsPromise) {
    vozEsPromise = Speech.getAvailableVoicesAsync()
      .then((voces) => {
        const exacta = voces.find((v) => v.language?.toLowerCase() === 'es-ar');
        if (exacta) return exacta.identifier;
        const genericaEs = voces.find((v) => v.language?.toLowerCase().startsWith('es'));
        return genericaEs?.identifier ?? null;
      })
      .catch(() => null);
  }
  return vozEsPromise;
}

let avisoVozFaltanteMostrado = false;

//lee el texto en voz alta; si ya está hablando lo detiene
export async function hablar(texto: string): Promise<void> {
  const estaHablando = await Speech.isSpeakingAsync();

  if (estaHablando) {
    Speech.stop();
    hablandoId = null;
    return;
  }

  const voiceId = Platform.OS === 'web' ? null : await obtenerVozEs();
  if (Platform.OS !== 'web' && !voiceId && !avisoVozFaltanteMostrado) {
    // No hay NINGUNA voz en español instalada en el equipo — avisar una sola
    // vez por sesión en vez de quedarse en silencio sin explicación, ya que
    // esta función la usan personas con poca visibilidad que dependen de
    // escuchar el texto.
    avisoVozFaltanteMostrado = true;
    Alert.alert(
      'Función de voz no disponible',
      'Este teléfono no tiene instalada una voz en español para leer en voz alta. Se puede instalar desde Ajustes → Accesibilidad → Texto a voz.',
    );
  }

  hablandoId = texto;
  Speech.speak(texto, {
    language: 'es-AR',
    voice: voiceId ?? undefined,
    pitch: 1.0,
    rate: 0.85, // ligeramente más lento para adultos mayores
    onDone: () => { hablandoId = null; },
    onError: (err) => {
      hablandoId = null;
      console.warn('[TTS] Error al hablar:', err);
    },
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
